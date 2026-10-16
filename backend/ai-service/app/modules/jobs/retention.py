from datetime import timedelta

from sqlalchemy import delete, exists, select, update

from app.infrastructure.database import Idempotency, now
from app.modules.conversations.models import Conversation, ConversationSource, Message
from app.modules.documents.models import DocumentIndex, DocumentSource
from app.modules.jobs.models import Job


def cleanup(database, days):
    cutoff = now() - timedelta(days=days)
    with database.sessions.begin() as session:
        expired = session.scalars(
            select(Conversation)
            .where(Conversation.updated_at < cutoff)
            .with_for_update(skip_locked=True)
            .limit(100)
        ).all()
        for conversation in expired:
            session.execute(
                delete(Message).where(
                    Message.conversation_id == conversation.id, Message.role == "ASSISTANT"
                )
            )
            session.execute(delete(Message).where(Message.conversation_id == conversation.id))
            session.execute(
                delete(ConversationSource).where(
                    ConversationSource.conversation_id == conversation.id
                )
            )
            conversation.deleted, conversation.title = True, "Expired"
            session.execute(
                update(Job)
                .where(Job.parameters["conversationId"].as_string() == conversation.id)
                .values(
                    status="CANCELLED", parameters={}, result=None, error=None, lease_token=None
                )
            )
        sources = session.scalars(
            select(DocumentSource)
            .where(
                DocumentSource.updated_at < cutoff,
                ~exists(
                    select(ConversationSource.index_id)
                    .join(DocumentIndex, ConversationSource.index_id == DocumentIndex.id)
                    .where(DocumentIndex.source_id == DocumentSource.id)
                ),
            )
            .limit(100)
        ).all()
        for source in sources:
            session.execute(
                update(Job)
                .where(Job.parameters["sourceId"].as_string() == source.id)
                .values(
                    status="CANCELLED", parameters={}, result=None, error=None, lease_token=None
                )
            )
            session.delete(source)
        session.execute(delete(Idempotency).where(Idempotency.created_at < cutoff))
