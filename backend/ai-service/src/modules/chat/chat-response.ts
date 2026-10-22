import type { Citation, VisualInput } from "../../common/types";
import { inspectAnswerCitations } from "./citation-check";
import { modelAnswer } from "../../infrastructure/integrations/llm.client";
import { isFollowUp, type ChatTurn } from "./chat-history";

function normalizedQuestion(question: string) {
  return question
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[!?.…,]+$/u, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function greetingReply(question: string): string | null {
  const text = normalizedQuestion(question);
  if (/^(hello|hi|hey|hi there|hello there)$/.test(text))
    return "Hello! What would you like to ask about your documents?";
  if (
    /^(xin chào|chào|chào bạn|chào bot|chào ai|chao|xin chao|chao ban)$/.test(
      text,
    )
  )
    return "Chào bạn! Bạn muốn hỏi gì về tài liệu?";
  return null;
}

export function immediateReply(question: string): string | null {
  const greeting = greetingReply(question);
  if (greeting) return greeting;
  const text = normalizedQuestion(question);
  const plain = text.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
  if (
    /^(ban (co the |)(lam (gi|duoc gi)|giup (gi|duoc gi))|ban co (kha nang|chuc nang) gi|chuc nang cua ban la gi)( voi tai lieu)?$/.test(
      plain,
    )
  )
    return "Mình có thể giúp bạn tóm tắt, giải thích, so sánh và trả lời câu hỏi dựa trên tài liệu trong notebook, kèm trích dẫn khi dùng thông tin từ nguồn. Bạn muốn bắt đầu với việc nào?";
  if (
    /^(what can you do|what can you help (me )?with|how can you help( me)?|what are your (capabilities|features))$/.test(
      text,
    )
  )
    return "I can help summarize, explain, compare, and answer questions about your notebook documents, with citations when using source information. What would you like to start with?";
  if (
    /^(giải thích( đi)?|nói rõ hơn|cái này|cái đó|là sao|ý là sao|giúp mình|giúp tôi)$/.test(
      text,
    )
  )
    return "Bạn muốn mình giải thích nội dung hoặc phần nào của tài liệu?";
  if (
    /^(explain( please)?|explain this|what do you mean|help( me)?)$/.test(text)
  )
    return "Which topic or part of the documents would you like help with?";
  return null;
}

function validateClarification(content: string) {
  const text = content.trim();
  if (text.length > 300 || !/[?？]$/.test(text) || /[\r\n]|\[\[/.test(text))
    throw new Error("Câu hỏi làm rõ không hợp lệ");
}

export async function generateChatResponse(
  question: string,
  evidence: Citation[],
  signal: AbortSignal,
  emit: (text: string) => void,
  history: ChatTurn[] = [],
  images: VisualInput[] = [],
) {
  const reply =
    history.length && isFollowUp(question) ? null : immediateReply(question);
  if (reply || !evidence.length) {
    const content =
      reply ??
      "Chưa tìm thấy thông tin phù hợp trong những nguồn đã chọn. Bạn muốn hỏi cụ thể nội dung nào hoặc bổ sung tài liệu nào?";
    signal.throwIfAborted();
    emit(content);
    return { content, citations: [] as Citation[] };
  }
  let content = "";
  let clarification = false;
  for await (const delta of modelAnswer(question, evidence, signal, {
    history,
    images,
    onClarification: () => {
      clarification = true;
    },
  })) {
    signal.throwIfAborted();
    content += delta;
    if (content.length > (clarification ? 300 : 20000))
      throw new Error("Câu trả lời quá dài");
    if (!clarification) emit(delta);
  }
  signal.throwIfAborted();
  if (clarification) {
    validateClarification(content);
    emit(content);
  }
  if (clarification) return { content, citations: [] as Citation[] };
  const checked = inspectAnswerCitations(content, evidence);
  if (checked.uncitedBlocks.length) {
    const note =
      "\n\nLưu ý: Một số đoạn chưa có trích dẫn trực tiếp. Bạn nên đối chiếu với nguồn trước khi sử dụng.";
    content += note;
    emit(note);
  }
  return { content, citations: checked.citations };
}
