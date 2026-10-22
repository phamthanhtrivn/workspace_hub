# Offline retrieval evaluation

Run `python evaluation/run.py --output evaluation/report.json` from `backend/rag-worker`.

`fixtures.json` contains 50 synthetic Vietnamese/English questions and five documents. No user content, remote API, model weights or credentials are used. The runner compares incoming candidate order with the same BM25 + RRF function used by the worker, and reports Recall@3, MRR and NDCG@3. Ties keep the original order in BM25.

These numbers measure candidate reranking, not dense retrieval, full Qdrant behavior, answer correctness, citation entailment or parity with another product. Replace the synthetic corpus with reviewed real-document questions and labels before making quality claims. Keep document permissions and notebook isolation tests in addition to relevance evaluation.

To add a case, add a query with `id`, `question`, `relevant` document IDs and a unique list of `candidates`. Include domain-specific dates, tables, paraphrases and cross-file questions. Unsupported questions and factual answer evaluation require a separate end-to-end evaluator and are deliberately not scored here.
