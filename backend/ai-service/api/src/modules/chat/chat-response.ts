import type { Citation, VisualInput } from "../../common/types";
import { inspectAnswerCitations } from "./citation-check";
import { modelAnswer } from "../../infrastructure/integrations/llm.client";
import { isFollowUp, type ChatTurn } from "./chat-history";
import { plainQuestion } from "../../common/text";
import { isClearlyUnrelated, notebookScopeRefusal } from "./notebook-scope";
import { isNotebookSummaryRequest } from "./summary-request";
import { isFirstQuestionRequest } from "./history-recall";

export type NotebookIntent =
  | { kind: "recall" | "summary" }
  | { kind: "reply"; content: string }
  | { kind: "answer"; followUp: boolean; clarification?: string };

function socialReply(text: string): string | null {
  if (/^(hello|hi|hey|hi there|hello there)$/.test(text))
    return "Hello! What would you like to ask about your documents?";
  if (/^(xin chao|chao(?: ban| bot| ai)?)$/.test(text))
    return "Chào bạn! Bạn muốn hỏi gì về tài liệu?";
  if (/^(thanks(?: a lot)?|thank you(?: very much)?)$/.test(text))
    return "You're welcome!";
  if (/^(?:cam on(?: ban| bot| ai)?|xin cam on)$/.test(text))
    return "Không có gì!";
  if (/^(bye|goodbye|see you(?: later)?)$/.test(text)) return "Goodbye!";
  if (/^(tam biet|hen gap lai)$/.test(text)) return "Hẹn gặp lại!";

  return null;
}

export function notebookIntent(question: string): NotebookIntent {
  if (isFirstQuestionRequest(question)) return { kind: "recall" };
  if (isNotebookSummaryRequest(question)) return { kind: "summary" };
  if (isClearlyUnrelated(question))
    return { kind: "reply", content: notebookScopeRefusal(question) };
  const text = plainQuestion(question);
  const reply = socialReply(text);
  if (reply) return { kind: "reply", content: reply };
  if (
    /^(ban (co the |)(lam (gi|duoc gi)|giup (gi|duoc gi))|ban co (kha nang|chuc nang) gi|chuc nang cua ban la gi)( voi tai lieu)?$/.test(
      text,
    )
  )
    return {
      kind: "reply",
      content:
        "Mình có thể giúp bạn tóm tắt, giải thích, so sánh và trả lời câu hỏi dựa trên tài liệu trong notebook, kèm trích dẫn khi dùng thông tin từ nguồn. Bạn muốn bắt đầu với việc nào?",
    };
  if (
    /^(what can you do|what can you help (me )?with|how can you help( me)?|what are your (capabilities|features))$/.test(
      text,
    )
  )
    return {
      kind: "reply",
      content:
        "I can help summarize, explain, compare, and answer questions about your notebook documents, with citations when using source information. What would you like to start with?",
    };
  if (
    /^(giai thich( di)?|noi ro hon|cai nay|cai do|la sao|y la sao|giup minh|giup toi)$/.test(
      text,
    )
  )
    return {
      kind: "answer",
      followUp: true,
      clarification:
        "Bạn muốn mình giải thích nội dung hoặc phần nào của tài liệu?",
    };
  if (
    /^(explain( please)?|explain this|what do you mean|help( me)?)$/.test(text)
  )
    return {
      kind: "answer",
      followUp: true,
      clarification:
        "Which topic or part of the documents would you like help with?",
    };

  return { kind: "answer", followUp: isFollowUp(question) };
}

function validateClarification(content: string) {
  const text = content.trim();
  if (text.length > 300 || !/[?？]$/.test(text) || /[\r\n]|\[\[/.test(text))
    throw new Error("Câu hỏi làm rõ không hợp lệ");
}

/** Final replies bypass the model; clarification fallbacks are used only without history. */
export async function generateChatResponse(
  question: string,
  evidence: Citation[],
  signal: AbortSignal,
  emit: (text: string) => void,
  history: ChatTurn[],
  images: VisualInput[],
  directReply: string | null,
) {
  if (directReply || !evidence.length) {
    const content =
      directReply ??
      "Chưa tìm thấy thông tin phù hợp trong những nguồn đã chọn. Bạn muốn hỏi cụ thể nội dung nào hoặc bổ sung tài liệu nào?";
    signal.throwIfAborted();
    emit(content);

    return { content, citations: [] as Citation[] };
  }
  let content = "";
  let clarification = false;
  let outOfScope = false;
  for await (const delta of modelAnswer(question, evidence, signal, {
    history,
    images,
    onClarification: () => {
      clarification = true;
    },
    onOutOfScope: () => {
      outOfScope = true;
    },
  })) {
    signal.throwIfAborted();
    content += delta;
    if (content.length > (clarification ? 300 : 20000))
      throw new Error("Câu trả lời quá dài");
    if (!clarification) emit(delta);
  }
  signal.throwIfAborted();
  if (outOfScope) {
    const refusal = notebookScopeRefusal(question);
    emit(refusal);

    return { content: refusal, citations: [] as Citation[] };
  }
  if (clarification) {
    validateClarification(content);
    emit(content);

    return { content, citations: [] as Citation[] };
  }
  const checked = inspectAnswerCitations(content, evidence);
  if (checked.uncitedBlocks.length) {
    const note =
      "\n\nLưu ý: Một số đoạn chưa có trích dẫn trực tiếp. Bạn nên đối chiếu với nguồn trước khi sử dụng.";
    content += note;
    emit(note);
  }

  return { content, citations: checked.citations };
}
