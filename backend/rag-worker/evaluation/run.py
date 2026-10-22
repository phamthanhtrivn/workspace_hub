"""Offline candidate-ranking evaluation. Does not call embeddings, Qdrant or an LLM."""
import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.rerank import rerank_candidates


def metrics(ranking, relevant):
    hits = [int(key in relevant) for key in ranking]
    recall = sum(hits[:3]) / len(relevant)
    reciprocal = next((1 / (i + 1) for i, hit in enumerate(hits) if hit), 0)
    dcg = sum(hit / math.log2(i + 2) for i, hit in enumerate(hits[:3]))
    ideal = sum(1 / math.log2(i + 2) for i in range(min(3, len(relevant))))
    return {"recall_at_3": recall, "mrr": reciprocal, "ndcg_at_3": dcg / ideal}


def evaluate(dataset):
    documents = {doc["id"]: doc["text"] for doc in dataset["documents"]}
    baseline, reranked = [], []
    for case in dataset["queries"]:
        candidates = case["candidates"]
        relevant = set(case["relevant"])
        if not relevant or not relevant.issubset(documents) or len(set(candidates)) != len(candidates):
            raise ValueError("Invalid evaluation labels/candidates")
        baseline.append(metrics(candidates, relevant))
        ordered = rerank_candidates(case["question"], [(key, documents[key]) for key in candidates])
        reranked.append(metrics(ordered, relevant))
    average = lambda values: {key: round(sum(row[key] for row in values) / len(values), 4) for key in values[0]}
    return {"scope": "synthetic_candidate_reranking_only", "queries": len(baseline),
            "baseline": average(baseline), "bm25_rrf": average(reranked),
            "limitations": ["Not an end-to-end RAG or model-quality benchmark", "No semantic entailment or abstention scoring", "Replace synthetic cases with reviewed real-document questions before release-quality comparisons"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=Path(__file__).with_name("fixtures.json"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = evaluate(json.loads(args.dataset.read_text(encoding="utf8")))
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf8")
    print(rendered)
