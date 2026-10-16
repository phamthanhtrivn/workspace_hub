from sqlalchemy import delete, select, update

from app.common.errors import ApiError, ErrorCode
from app.infrastructure.database import now
from app.infrastructure.idempotency import existing, remember
from app.modules.conversations.models import Conversation, ConversationSource, Message
from app.modules.conversations.repository import (
    conversation_response,
    conversation_sources,
    message_response,
    owned_conversation,
)
from app.modules.documents.constants import (
    ACTIVE_STATES,
    MAX_TOTAL_BYTES,
    MAX_TOTAL_CHUNKS,
    MAX_TOTAL_TOKENS,
    JobKind,
    State,
)
from app.modules.documents.repository import current_index, owned_source
from app.modules.ingestion.models import Chunk
from app.modules.jobs.models import Job


class ConversationService:
    def __init__(self, database, client):
        self.db, self.client = database, client

    def create(self, actor, request, key):
        payload = request.model_dump(mode="json", by_alias=True)
        with self.db.sessions.begin() as session:
            cached = existing(session, actor.id, "conversations", key, payload)
            if cached:
                conversation = owned_conversation(session, cached["id"], actor.id)
                self.client.access(actor, conversation_sources(session, conversation.id))
                return cached
            source_ids = list(dict.fromkeys(str(value) for value in request.source_ids))
            sources = [owned_source(session, source_id, actor.id) for source_id in source_ids]
            self.client.access(actor, sources)
            for source in sources:
                source.updated_at = now()
            indexes = [current_index(session, source.id) for source in sources]
            if any(index.status != State.READY for index in indexes):
                raise ApiError(
                    ErrorCode.SOURCE_NOT_READY, "Every selected document must be READY", 409
                )
            embedding_models = set(
                session.scalars(
                    select(Chunk.embedding_model)
                    .where(Chunk.index_id.in_([index.id for index in indexes]))
                    .distinct()
                )
            )
            if len(embedding_models) != 1:
                raise ApiError(
                    ErrorCode.SOURCE_NOT_READY,
                    "Selected sources must use the same embedding model",
                    409,
                )
            if (
                sum(source.manifest["sizeBytes"] for source in sources) > MAX_TOTAL_BYTES
                or sum(index.token_count for index in indexes) > MAX_TOTAL_TOKENS
                or sum(index.chunk_count for index in indexes) > MAX_TOTAL_CHUNKS
            ):
                raise ApiError(
                    ErrorCode.DOCUMENT_LIMIT_EXCEEDED,
                    "Combined conversation document limits exceeded",
                )
            conversation = Conversation(owner_id=actor.id, title=request.title)
            session.add(conversation)
            session.flush()
            session.add_all(
                ConversationSource(conversation_id=conversation.id, index_id=index.id)
                for index in indexes
            )
            session.flush()
            result = conversation_response(session, conversation)
            remember(session, actor.id, "conversations", key, payload, result)
            return result

    def get(self, actor, conversation_id):
        with self.db.sessions() as session:
            conversation = owned_conversation(session, conversation_id, actor.id)
            self.client.access(actor, conversation_sources(session, conversation.id))
            return conversation_response(session, conversation)

    def list(self, actor, after, limit):
        with self.db.sessions() as session:
            query = select(Conversation).where(
                Conversation.owner_id == actor.id, Conversation.deleted.is_(False)
            )
            if after:
                query = query.where(Conversation.id > after)
            conversations = session.scalars(query.order_by(Conversation.id).limit(limit + 1)).all()
            results = []
            for conversation in conversations[:limit]:
                try:
                    self.client.access(actor, conversation_sources(session, conversation.id))
                except ApiError as error:
                    if error.status_code in (403, 404, 409):
                        continue
                    raise
                results.append(conversation_response(session, conversation))
            return {
                "conversations": results,
                "nextCursor": conversations[limit - 1].id if len(conversations) > limit else None,
            }

    def send(self, actor, conversation_id, request, key):
        if not request.content.strip():
            raise ApiError(ErrorCode.VALIDATION_FAILED, "Question cannot be blank")
        payload = request.model_dump(mode="json")
        with self.db.sessions.begin() as session:
            conversation = owned_conversation(session, conversation_id, actor.id, lock=True)
            self.client.access(actor, conversation_sources(session, conversation.id))
            operation = "messages:" + conversation.id
            cached = existing(session, actor.id, operation, key, payload)
            if cached:
                return cached
            active = session.scalar(
                select(Job.id).where(
                    Job.kind == JobKind.ANSWER,
                    Job.parameters["conversationId"].as_string() == conversation.id,
                    Job.status.in_(ACTIVE_STATES),
                )
            )
            if active:
                raise ApiError(
                    ErrorCode.CONVERSATION_BUSY, "A reply is already being generated", 409
                )
            question = Message(
                conversation_id=conversation.id,
                sequence=conversation.sequence + 1,
                role="USER",
                status=State.COMPLETED,
                content=request.content.strip(),
            )
            session.add(question)
            session.flush()
            job = Job(
                owner_id=actor.id,
                kind=JobKind.ANSWER,
                parameters={"conversationId": conversation.id, "questionId": question.id},
            )
            session.add(job)
            session.flush()
            reply = Message(
                conversation_id=conversation.id,
                sequence=conversation.sequence + 2,
                role="ASSISTANT",
                status=State.PENDING,
                reply_to_id=question.id,
                generation_job_id=job.id,
            )
            session.add(reply)
            session.flush()
            conversation.sequence += 2
            result = {"jobId": job.id, "userMessageId": question.id, "assistantMessageId": reply.id}
            remember(session, actor.id, operation, key, payload, result)
            return result

    def messages(self, actor, conversation_id, after, limit):
        with self.db.sessions() as session:
            conversation = owned_conversation(session, conversation_id, actor.id)
            self.client.access(actor, conversation_sources(session, conversation.id))
            messages = session.scalars(
                select(Message)
                .where(Message.conversation_id == conversation.id, Message.sequence > after)
                .order_by(Message.sequence)
                .limit(limit + 1)
            ).all()
            return {
                "messages": [message_response(message) for message in messages[:limit]],
                "nextCursor": messages[limit - 1].sequence if len(messages) > limit else None,
            }

    def remove(self, actor, conversation_id):
        with self.db.sessions.begin() as session:
            conversation = owned_conversation(session, conversation_id, actor.id, lock=True)
            conversation.deleted, conversation.title = True, "Deleted"
            session.execute(
                update(Job)
                .where(
                    Job.owner_id == actor.id,
                    Job.kind == JobKind.ANSWER,
                    Job.parameters["conversationId"].as_string() == conversation.id,
                    Job.status.in_(ACTIVE_STATES),
                )
                .values(status=State.CANCELLED, lease_token=None)
            )
            # Remove generated text immediately; preserve the job's non-content audit trail.
            session.execute(
                delete(Message).where(
                    Message.conversation_id == conversation.id, Message.role == "ASSISTANT"
                )
            )
            session.execute(delete(Message).where(Message.conversation_id == conversation.id))
            return {"id": conversation.id, "deleted": True}
