from sqlalchemy import select

from app.common.errors import ApiError
from app.infrastructure.idempotency import existing, lock_key, remember
from app.modules.documents.constants import ACTIVE_STATES, JobKind, State
from app.modules.documents.models import DocumentIndex, DocumentSource
from app.modules.documents.pipeline import pipeline_fingerprint
from app.modules.documents.repository import current_index, owned_source, source_response
from app.modules.documents.schemas import FileMetadata
from app.modules.documents.validation import validate_metadata
from app.modules.jobs.models import Job


class DocumentService:
    def __init__(self, database, client, settings):
        self.db, self.client, self.settings = database, client, settings

    def register(self, actor, request, key):
        payload = request.model_dump(mode="json", by_alias=True)
        with self.db.sessions.begin() as session:
            cached = existing(session, actor.id, "documents", key, payload)
            if cached:
                sources = [
                    owned_source(session, value["sourceId"], actor.id)
                    for value in cached["documents"]
                ]
                self.client.access(actor, sources)
                return cached
            references = list(
                {
                    (str(ref.document_id), ref.version_id): ref.model_dump(
                        mode="json", by_alias=True
                    )
                    for ref in request.documents
                }.values()
            )
            manifests = self.client.resolve(actor, references)
            validate_metadata(
                [
                    FileMetadata(
                        name=manifest["name"],
                        mimeType=manifest["mimeType"],
                        sizeBytes=manifest["sizeBytes"],
                    )
                    for manifest in manifests
                ]
            )
            batch = Job(owner_id=actor.id, kind=JobKind.BATCH, status=State.RUNNING)
            session.add(batch)
            session.flush()
            results = []
            pipeline = pipeline_fingerprint(self.settings)
            for manifest in manifests:
                lock_key(session, actor.id + manifest["documentId"] + manifest["revision"])
                source = session.scalar(
                    select(DocumentSource).where(
                        DocumentSource.owner_id == actor.id,
                        DocumentSource.document_id == manifest["documentId"],
                        DocumentSource.version_id == manifest["versionId"],
                        DocumentSource.revision == manifest["revision"],
                    )
                )
                if not source:
                    source = DocumentSource(
                        owner_id=actor.id,
                        owner_email=actor.email,
                        document_id=manifest["documentId"],
                        version_id=manifest["versionId"],
                        revision=manifest["revision"],
                        manifest={
                            name: value for name, value in manifest.items() if name != "downloadUrl"
                        },
                    )
                    session.add(source)
                    session.flush()
                index = session.scalar(
                    select(DocumentIndex).where(
                        DocumentIndex.source_id == source.id, DocumentIndex.pipeline == pipeline
                    )
                )
                if not index:
                    index = DocumentIndex(source_id=source.id, pipeline=pipeline)
                    session.add(index)
                    session.flush()
                active = session.scalar(
                    select(Job).where(
                        Job.kind == JobKind.INGEST,
                        Job.parameters["indexId"].as_string() == index.id,
                        Job.status.in_(ACTIVE_STATES),
                    )
                )
                if index.status == State.READY or active:
                    child = Job(
                        owner_id=actor.id,
                        kind="REFERENCE",
                        parent_id=batch.id,
                        status=State.SUCCEEDED if index.status == State.READY else State.PENDING,
                        parameters={
                            "sourceId": source.id,
                            "indexId": index.id,
                            "referenceJobId": active.id if active else None,
                        },
                    )
                else:
                    index.status, index.error = State.PENDING, None
                    child = Job(
                        owner_id=actor.id,
                        kind=JobKind.INGEST,
                        parent_id=batch.id,
                        parameters={"sourceId": source.id, "indexId": index.id},
                    )
                session.add(child)
                session.flush()
                results.append(
                    {
                        "sourceId": source.id,
                        "indexId": index.id,
                        "jobId": child.id,
                        "status": index.status,
                    }
                )
            result = {"batchJobId": batch.id, "documents": results}
            remember(session, actor.id, "documents", key, payload, result)
            return result

    def get(self, actor, source_id):
        with self.db.sessions() as session:
            source = owned_source(session, source_id, actor.id)
            self.client.access(actor, [source])
            return source_response(source, current_index(session, source.id))

    def list(self, actor, after: str | None, limit: int):
        with self.db.sessions() as session:
            query = select(DocumentSource).where(DocumentSource.owner_id == actor.id)
            if after:
                query = query.where(DocumentSource.id > after)
            sources = session.scalars(query.order_by(DocumentSource.id).limit(limit + 1)).all()
            results = []
            for source in sources[:limit]:
                # Fail closed for a revoked source, including stored metadata.
                try:
                    self.client.access(actor, [source])
                except ApiError as error:
                    if error.status_code in (403, 404, 409):
                        continue
                    raise
                results.append(source_response(source, current_index(session, source.id)))
            return {
                "documents": results,
                "nextCursor": sources[limit - 1].id if len(sources) > limit else None,
            }
