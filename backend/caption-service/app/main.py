import asyncio
import contextlib
import hmac
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import timedelta
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, Header, HTTPException
from livekit import api, rtc
from pydantic import BaseModel, Field
from whisperlivekit import AudioProcessor, TranscriptionEngine

from .captions import TOPIC, snapshot_caption
from .engine import create_engine, warm_streaming_engine

log = logging.getLogger("meeting-captions")
LANGUAGE = os.getenv("CAPTION_LANGUAGE", "vi")
MAX_ROOMS = int(os.getenv("CAPTION_MAX_ROOMS", "2"))
MAX_SPEAKERS = int(os.getenv("CAPTION_MAX_SPEAKERS", "4"))
LEASE_SECONDS = int(os.getenv("CAPTION_LEASE_SECONDS", "90"))
engine: TranscriptionEngine | None = None
sessions: dict[str, "CaptionSession"] = {}
session_lock = asyncio.Lock()


class SessionRequest(BaseModel):
    meetingId: UUID
    roomName: str = Field(min_length=1, max_length=200)
    viewerId: UUID


def authorize(authorization: str = Header(default="")) -> None:
    secret = os.getenv("CAPTION_SERVICE_TOKEN", "")
    if not secret or not hmac.compare_digest(
        authorization.encode(), ("Bearer " + secret).encode()
    ):
        raise HTTPException(401, "Service authentication is required")


class CaptionSession:
    def __init__(self, request: SessionRequest):
        self.meeting_id = str(request.meetingId)
        self.room_name = request.roomName
        self.identity = "captions:" + self.meeting_id
        self.room = rtc.Room()
        self.viewers: dict[str, float] = {}
        self.tracks: dict[str, asyncio.Task] = {}
        self.closed = False
        self.failed = False
        self.watchdog: asyncio.Task | None = None

    def renew(self, viewer: str) -> None:
        self.viewers[viewer] = time.monotonic() + LEASE_SECONDS

    async def start(self) -> None:
        @self.room.on("track_published")
        def published(
            publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant
        ):
            if publication.source == rtc.TrackSource.SOURCE_MICROPHONE:
                publication.set_subscribed(True)

        @self.room.on("track_subscribed")
        def subscribed(
            track: rtc.Track,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ):
            if (
                publication.source != rtc.TrackSource.SOURCE_MICROPHONE
                or track.sid in self.tracks
                or publication.muted
            ):
                return
            if len(self.tracks) >= MAX_SPEAKERS:
                asyncio.create_task(
                    self.publish_error(
                        "Speaker capacity reached. Captions for some participants are unavailable."
                    )
                )
                publication.set_subscribed(False)
                return
            task = asyncio.create_task(self.transcribe(track, participant))
            self.tracks[track.sid] = task
            task.add_done_callback(
                lambda finished: self.track_finished(track.sid, finished)
            )

        @self.room.on("track_unsubscribed")
        def unsubscribed(track: rtc.Track, *_):
            if task := self.tracks.pop(track.sid, None):
                task.cancel()

        @self.room.on("track_muted")
        def muted(
            participant: rtc.RemoteParticipant, publication: rtc.RemoteTrackPublication
        ):
            if publication.source != rtc.TrackSource.SOURCE_MICROPHONE:
                return
            if task := self.tracks.pop(publication.sid, None):
                task.cancel()
            asyncio.create_task(
                self.publish({"type": "clear", "speakerId": participant.identity})
            )

        @self.room.on("track_unmuted")
        def unmuted(
            participant: rtc.RemoteParticipant, publication: rtc.RemoteTrackPublication
        ):
            if publication.track:
                subscribed(publication.track, publication, participant)

        @self.room.on("disconnected")
        def disconnected(*_):
            asyncio.create_task(self.terminate())

        token = (
            api.AccessToken()
            .with_identity(self.identity)
            .with_name("Live captions")
            .with_kind("agent")
            .with_metadata(json.dumps({"service": "captions"}))
            .with_ttl(timedelta(hours=4))
            .with_grants(
                api.VideoGrants(
                    room_join=True,
                    room=self.room_name,
                    can_publish=False,
                    can_publish_data=True,
                    can_subscribe=True,
                )
            )
            .to_jwt()
        )
        await asyncio.wait_for(
            self.room.connect(
                os.environ["LIVEKIT_URL"], token, rtc.RoomOptions(auto_subscribe=False)
            ),
            15,
        )
        for participant in self.room.remote_participants.values():
            for publication in participant.track_publications.values():
                published(publication, participant)
        self.watchdog = asyncio.create_task(self.watch())

    def track_finished(self, sid: str, task: asyncio.Task) -> None:
        if self.tracks.get(sid) is task:
            self.tracks.pop(sid, None)
        if not task.cancelled() and task.exception() is not None:
            self.failed = True
            log.error(
                "Caption track initialization failed: %s",
                type(task.exception()).__name__,
            )
            asyncio.create_task(
                self.publish_error(
                    "Speech recognition is temporarily unavailable. Turn captions off and on to retry."
                )
            )

    async def publish(self, payload: dict) -> None:
        if not self.closed:
            await self.room.local_participant.publish_data(
                json.dumps(payload, ensure_ascii=False).encode(),
                reliable=True,
                topic=TOPIC,
            )

    async def publish_error(self, message: str) -> None:
        await self.publish({"type": "error", "message": message})

    async def transcribe(
        self, track: rtc.Track, participant: rtc.RemoteParticipant
    ) -> None:
        processor = AudioProcessor(
            transcription_engine=engine, pcm_input=True, language=LANGUAGE, mode="diff"
        )
        logging.getLogger("whisperlivekit.audio_processor").setLevel(logging.WARNING)
        stream = rtc.AudioStream(track, sample_rate=16000, num_channels=1, capacity=200)
        last = ""
        sequence = 0
        stream_id = track.sid + ":" + uuid4().hex[:12]

        async def forward() -> None:
            nonlocal last, sequence
            results = await processor.create_tasks()
            async for result in results:
                data = result.to_dict()
                if data.get("error"):
                    self.failed = True
                    await self.publish_error(
                        "Speech recognition is temporarily unavailable. Turn captions off and on to retry."
                    )
                    return
                text, final = snapshot_caption(data)
                lines = data.get("lines", [])
                key = json.dumps([text, final, lines[-1].get("end") if lines else None])
                if not text or key == last:
                    continue
                last = key
                sequence += 1
                await self.publish(
                    {
                        "type": "caption",
                        "speakerId": participant.identity,
                        "speakerName": participant.name or "Participant",
                        "trackId": stream_id,
                        "text": text,
                        "final": final,
                        "sequence": sequence,
                        "language": LANGUAGE,
                    }
                )

        output = asyncio.create_task(forward())
        try:
            async for event in stream:
                if output.done():
                    await output
                    break
                if (
                    processor.transcription_queue is not None
                    and processor.transcription_queue.qsize() > 500
                ):
                    raise RuntimeError(
                        "Caption processing backlog exceeded the session budget"
                    )
                await processor.process_audio(bytes(event.frame.data))
        except asyncio.CancelledError:
            raise
        except Exception:
            self.failed = True
            log.exception("Caption track processing failed")
            with contextlib.suppress(Exception):
                await self.publish_error(
                    "Speech recognition is temporarily unavailable. Turn captions off and on to retry."
                )
        finally:
            output.cancel()
            await asyncio.gather(output, return_exceptions=True)
            await stream.aclose()
            await processor.cleanup()

    async def watch(self) -> None:
        while not self.closed:
            await asyncio.sleep(5)
            now = time.monotonic()
            self.viewers = {
                user: expiry for user, expiry in self.viewers.items() if expiry > now
            }
            humans = [
                p
                for p in self.room.remote_participants.values()
                if p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD
            ]
            if not self.viewers or not humans or self.failed:
                await self.terminate()

    async def terminate(self) -> None:
        async with session_lock:
            await self.stop()

    async def stop(self) -> None:
        if self.closed:
            return
        self.closed = True
        if sessions.get(self.meeting_id) is self:
            sessions.pop(self.meeting_id, None)
        if self.watchdog and self.watchdog is not asyncio.current_task():
            self.watchdog.cancel()
        tasks = list(self.tracks.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await self.room.disconnect()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global engine
    if not os.getenv("CAPTION_SERVICE_TOKEN"):
        raise RuntimeError("CAPTION_SERVICE_TOKEN is required")
    engine = await asyncio.to_thread(create_engine, LANGUAGE)
    await warm_streaming_engine(engine)
    yield
    await asyncio.gather(
        *(session.stop() for session in list(sessions.values())), return_exceptions=True
    )


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None)


@app.get("/health")
def health():
    return {
        "ready": engine is not None,
        "language": LANGUAGE,
        "model": os.getenv("CAPTION_MODEL", "small"),
    }


@app.post("/sessions", dependencies=[Depends(authorize)])
async def start(request: SessionRequest):
    meeting_id = str(request.meetingId)
    async with session_lock:
        session = sessions.get(meeting_id)
        if not session:
            if len(sessions) >= MAX_ROOMS:
                raise HTTPException(
                    429, "Live captions are at capacity. Please try again later."
                )
            session = CaptionSession(request)
            session.renew(str(request.viewerId))
            sessions[meeting_id] = session
            try:
                await session.start()
            except Exception:
                await session.stop()
                log.exception("Could not connect caption worker")
                raise HTTPException(503, "Could not start live captions") from None
        session.renew(str(request.viewerId))
    return {"workerIdentity": session.identity, "language": LANGUAGE}


@app.delete(
    "/sessions/{meeting_id}/viewers/{viewer_id}", dependencies=[Depends(authorize)]
)
async def release(meeting_id: UUID, viewer_id: UUID):
    async with session_lock:
        if session := sessions.get(str(meeting_id)):
            session.viewers.pop(str(viewer_id), None)
            if not session.viewers:
                await session.stop()
    return {"released": True}
