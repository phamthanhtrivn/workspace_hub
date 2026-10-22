import type { Citation } from "../../common/types";
import { validateCitations } from "../../common/evidence-policy";

/** Structural grounding checks, not a semantic entailment guarantee. */
export function validateAnswerCitations(
  content: string,
  evidence: Citation[],
): Citation[] {
  return inspectAnswerCitations(content, evidence).citations;
}

export function inspectAnswerCitations(content: string, evidence: Citation[]) {
  const used = validateCitations(content, evidence);
  const blocks = content
    .split(/\n\s*\n|\n(?=\s*(?:[-*•]|\d+[.)])\s)/)
    .map((block) => block.trim())
    .filter(Boolean);
  const uncitedBlocks = blocks.filter((block) => {
    if (/\[\[S\d+\]\]/.test(block)) return false;
    if (/^#{1,6}\s+[^\n]+$/.test(block) || /^[^\n.!?]{1,240}:$/.test(block))
      return false;
    if (
      block.length <= 400 &&
      !/\d/.test(block) &&
      /^(?:Lưu ý:\s*)?(?:nội dung|câu trả lời|bản tóm tắt) (?:trên|này) chỉ dựa trên (?:các|những) đoạn trích/i.test(
        block,
      ) &&
      /chưa thể khẳng định|không (?:phải|đại diện|bao quát)/i.test(block)
    )
      return false;
    return true;
  });
  return { citations: used, uncitedBlocks };
}
