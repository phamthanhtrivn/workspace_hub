import hashlib

from sqlalchemy import select

from app.common.errors import ErrorCode, ProcessingError
from app.core.auth import Actor
from app.modules.documents.constants import State
from app.modules.documents.models import DocumentIndex, DocumentSource
from app.modules.documents.pipeline import pipeline_fingerprint
from app.modules.ingestion.chunking import create_chunks
from app.modules.ingestion.converter import convert_isolated
from app.modules.ingestion.models import Chunk


def prepare_index(context, client, settings, manifest, index_id):
    context.stage("FETCHING")
    with client.download(manifest) as path:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        context.stage("VALIDATING")
        parsed = convert_isolated(path, settings.parse_timeout_seconds)
    context.stage("CHUNKING")
    chunks, tokens = create_chunks(parsed["blocks"])
    with context.db.sessions.begin() as session:
        context.guard(session)
        index = session.get(DocumentIndex, index_id, with_for_update=True)
        if index.content_hash and index.content_hash != digest:
            raise ProcessingError(ErrorCode.SOURCE_CHANGED, "Source bytes changed while processing")
        index.content_hash = digest
        index.markdown = "\n\n".join(block["content"] for block in parsed["blocks"])
        index.token_count, index.chunk_count, index.warnings = (
            tokens,
            len(chunks),
            parsed["warnings"],
        )
        existing = session.scalars(
            select(Chunk).where(Chunk.index_id == index.id).order_by(Chunk.position)
        ).all()
        if existing:
            if [(chunk.content, chunk.locator) for chunk in existing] != [
                (chunk["content"], chunk["locator"]) for chunk in chunks
            ]:
                raise ProcessingError(
                    ErrorCode.SOURCE_CHANGED, "Parsed document differs from its checkpoint"
                )
        else:
            session.add_all(
                Chunk(
                    index_id=index.id,
                    position=position,
                    content=chunk["content"],
                    locator=chunk["locator"],
                    embedding_model=settings.gemini_embedding_model,
                )
                for position, chunk in enumerate(chunks)
            )


def ingest(context, client, provider, settings, parameters):
    with context.db.sessions() as session:
        source = session.get(DocumentSource, parameters["sourceId"])
        actor = Actor(source.owner_id, source.owner_email)
        index = session.get(DocumentIndex, parameters["indexId"])
        if index.pipeline != pipeline_fingerprint(settings):
            raise ProcessingError(
                ErrorCode.SOURCE_CHANGED,
                "Index configuration changed; register the documents again",
            )
        prepared = bool(index.content_hash and index.chunk_count)

    def authorize():
        context.check()
        return client.access(actor, [source])[0]

    provider.check_active = authorize
    manifest = authorize()
    if not prepared:
        prepare_index(context, client, settings, manifest, parameters["indexId"])
    context.stage("EMBEDDING")
    with context.db.sessions() as session:
        pending = session.scalars(
            select(Chunk)
            .where(Chunk.index_id == parameters["indexId"], Chunk.embedding.is_(None))
            .order_by(Chunk.position)
        ).all()
    for chunk in pending:
        embedding = provider.embed(
            chunk.content, title=source.manifest["name"], model=chunk.embedding_model
        )
        with context.db.sessions.begin() as session:
            context.guard(session)
            session.get(Chunk, chunk.id).embedding = embedding
    authorize()
    with context.db.sessions.begin() as session:
        context.guard(session)
        index = session.get(DocumentIndex, parameters["indexId"])
        index.status, index.error = State.READY, None
    return {"sourceId": source.id, "indexId": parameters["indexId"]}
