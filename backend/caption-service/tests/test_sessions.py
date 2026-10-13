import asyncio
import json
import os
import time
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app import main
from fastapi import HTTPException


class FakeSession:
    created = 0

    def __init__(self, request):
        FakeSession.created += 1
        self.meeting_id = str(request.meetingId)
        self.identity = "captions:" + self.meeting_id
        self.viewers = {}
        self.stop = AsyncMock()
        self.start = AsyncMock()

    def renew(self, viewer):
        self.viewers[viewer] = time.monotonic() + main.LEASE_SECONDS


class SessionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        main.sessions.clear()
        main.session_lock = asyncio.Lock()
        FakeSession.created = 0
        self.request = main.SessionRequest(
            meetingId=uuid4(), roomName="test-room", viewerId=uuid4()
        )

    async def asyncTearDown(self):
        main.sessions.clear()

    async def test_concurrent_viewers_share_one_worker(self):
        with patch.object(main, "CaptionSession", FakeSession):
            other = self.request.model_copy(update={"viewerId": uuid4()})
            results = await asyncio.gather(main.start(self.request), main.start(other))
            self.assertEqual(results[0], results[1])
            self.assertEqual(FakeSession.created, 1)
            session = main.sessions[str(self.request.meetingId)]
            self.assertEqual(len(session.viewers), 2)
            session.start.assert_awaited_once()

    async def test_releasing_one_viewer_preserves_the_other(self):
        with patch.object(main, "CaptionSession", FakeSession):
            other = self.request.model_copy(update={"viewerId": uuid4()})
            await main.start(self.request)
            await main.start(other)
            session = main.sessions[str(self.request.meetingId)]
            await main.release(self.request.meetingId, self.request.viewerId)
            session.stop.assert_not_awaited()
            await main.release(other.meetingId, other.viewerId)
            session.stop.assert_awaited_once()

    async def test_capacity_rejects_new_room_but_allows_existing_viewer_renewal(self):
        with (
            patch.object(main, "CaptionSession", FakeSession),
            patch.object(main, "MAX_ROOMS", 1),
        ):
            await main.start(self.request)
            await main.start(self.request)
            other = self.request.model_copy(update={"meetingId": uuid4()})
            with self.assertRaises(HTTPException) as failure:
                await main.start(other)
            self.assertEqual(failure.exception.status_code, 429)

    async def test_failed_connection_stops_the_incomplete_worker(self):
        failing = FakeSession(self.request)
        failing.start.side_effect = RuntimeError("Connection failed")
        with patch.object(main, "CaptionSession", return_value=failing):
            with self.assertRaises(HTTPException) as failure:
                await main.start(self.request)
            self.assertEqual(failure.exception.status_code, 503)
            failing.stop.assert_awaited_once()

    async def test_viewer_lease_is_renewed(self):
        with patch.object(main, "CaptionSession", FakeSession):
            await main.start(self.request)
            session = main.sessions[str(self.request.meetingId)]
            session.viewers[str(self.request.viewerId)] = 0
            await main.start(self.request)
            self.assertGreater(
                session.viewers[str(self.request.viewerId)], time.monotonic()
            )

    def test_internal_token_is_required_even_for_non_ascii_inputs(self):
        with patch.dict(os.environ, {"CAPTION_SERVICE_TOKEN": "test-secret"}):
            main.authorize("Bearer test-secret")
            for value in ["", "Bearer wrong", "Bearer tiếng Việt"]:
                with self.assertRaises(HTTPException) as failure:
                    main.authorize(value)
                self.assertEqual(failure.exception.status_code, 401)

    async def test_livekit_mute_clears_captions_and_unmute_starts_a_new_stream(self):
        callbacks = {}
        room = SimpleNamespace(
            on=lambda name: lambda callback: callbacks.setdefault(name, callback),
            connect=AsyncMock(),
            disconnect=AsyncMock(),
            remote_participants={},
            local_participant=SimpleNamespace(publish_data=AsyncMock()),
        )
        with (
            patch.object(main.rtc, "Room", return_value=room),
            patch.dict(
                os.environ,
                {
                    "LIVEKIT_API_KEY": "test-key",
                    "LIVEKIT_API_SECRET": "test-secret-that-is-at-least-32-bytes-long",
                    "LIVEKIT_URL": "ws://test",
                },
            ),
        ):
            session = main.CaptionSession(self.request)
            gate = asyncio.Event()

            async def transcribe(*_):
                await gate.wait()

            session.transcribe = AsyncMock(side_effect=transcribe)
            await session.start()
            track = SimpleNamespace(sid="microphone")
            publication = SimpleNamespace(
                sid="microphone",
                muted=False,
                source=main.rtc.TrackSource.SOURCE_MICROPHONE,
                track=track,
            )
            participant = SimpleNamespace(identity="speaker", name="Speaker")
            callbacks["track_subscribed"](track, publication, participant)
            await asyncio.sleep(0)
            self.assertIn("microphone", session.tracks)
            publication.muted = True
            callbacks["track_muted"](participant, publication)
            await asyncio.sleep(0)
            self.assertNotIn("microphone", session.tracks)
            sent = json.loads(room.local_participant.publish_data.call_args.args[0])
            self.assertEqual(sent, {"type": "clear", "speakerId": "speaker"})
            publication.muted = False
            callbacks["track_unmuted"](participant, publication)
            await asyncio.sleep(0)
            self.assertEqual(session.transcribe.await_count, 2)
            self.assertIn("microphone", session.tracks)
            await session.stop()


if __name__ == "__main__":
    unittest.main()
