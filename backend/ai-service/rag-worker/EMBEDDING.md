# Document embedding and reuse

`EMBEDDING_INDEX_STRATEGY=shard` assigns each document to one model instead of
embedding every document with every model. Rendezvous hashing chooses the first
assignment; persisted per-document routes keep retrieval stable after restarts or
quota fallback. Each model retains its own Qdrant vector space. Do not remove a
model with assigned documents without migrating those documents first.

Before switching existing replicated indexes, run
`node backend/scripts/prepare-embedding-shards.cjs` from the repository root.
It verifies every READY document's assigned collection and seeds the cache from
existing vectors without calling an embedding API. Keep workers idle while
preparing and switching the strategy. Existing replicated vectors remain intact.
Switching back to `ensemble` requires populating all model collections for any
documents added while sharding was active.

Document routes and active index generations are stored in the Qdrant collection
`wh_notebook_manifests_v1`. Back this collection up with the document collections.
New generations are completely written and counted before activation. Failed
staging stays invisible; old generations are removed only after activation.
Mutations of one document are serialized without blocking separate uploads.
Run `node backend/scripts/prepare-embedding-shards.cjs --migrate-routes` to verify
and migrate legacy SQLite routes before deploying this version.

The cache at `/models/embedding-cache.sqlite3` stores content hashes and float32
vectors, separated by notebook and model collection. It retains at most 20,000
entries for 30 days. Duplicate chunks share generation; changed documents reuse
unchanged chunks. The existing model volume persists the cache and document
routes from older versions. Deleting a source preserves the notebook's shared
chunk cache until expiry; deleting a notebook clears its cache and manifests.

When Gemini returns HTTP 429, sharding temporarily uses the configured local
model and persists the successful assignment. Existing documents switch only
after a matching local index is verified or rebuilt from their stored chunks by
a dedicated background queue (one conversion at a time, at most 20 pending).
Queries report `RAG_FALLBACK_PENDING` while conversion is being prepared.
Queued/running conversions are recovered from Qdrant after restart.
Minute quota follows Retry-After (default 60 seconds); daily quota is checked
again after an hour. Daily quota rejection skips
minute-quota retries. Unknown provider failures are propagated rather than
replaying their requests. Readiness can remain healthy through Gemini quota
exhaustion when local embedding is available; `embeddingAvailableModels` reports
the currently usable models.

The optimization applies to embedding, not extraction or Vision analysis.
