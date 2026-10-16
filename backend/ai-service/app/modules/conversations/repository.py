from sqlalchemy import select

from app.common.errors import ApiError, ErrorCode
from app.modules.conversations.models import Conversation, ConversationSource, Message
from app.modules.documents.models import DocumentIndex, DocumentSource


def owned_conversation(session, conversation_id, actor_id, lock=False):
    query = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.owner_id == actor_id,
        Conversation.deleted.is_(False),
    )
    if lock:
        query = query.with_for_update()
    conversation = session.scalar(query)
    if not conversation:
        raise ApiError(ErrorCode.NOT_FOUND, "Conversation not found", 404)
    return conversation


def conversation_sources(session, conversation_id):
    return session.scalars(
        select(DocumentSource)
        .join(DocumentIndex, DocumentIndex.source_id == DocumentSource.id)
        .join(ConversationSource, ConversationSource.index_id == DocumentIndex.id)
        .where(ConversationSource.conversation_id == conversation_id)
        .order_by(DocumentSource.id)
    ).all()


def conversation_response(session, conversation):
    return {
        "id": conversation.id,
        "title": conversation.title,
        "sourceIds": [source.id for source in conversation_sources(session, conversation.id)],
    }


def message_response(message: Message):
    return {
        "id": message.id,
        "sequence": message.sequence,
        "role": message.role,
        "status": message.status,
        "content": message.content,
        "replyToMessageId": message.reply_to_id,
        "jobId": message.generation_job_id,
        "answerStatus": message.answer_status,
        "citations": message.citations,
        "createdAt": message.created_at,
    }
