import { plainText } from "../../common/text";

export function notebookScopeRefusal(question: string) {
  return /[\u00c0-\u024f\u1e00-\u1eff]/.test(question)
    ? "Notebook chỉ hỗ trợ câu hỏi liên quan đến tài liệu đang chọn và dự án được đề cập trong nguồn. Mình không hỗ trợ mua sắm, đi chơi hoặc sắp lịch cá nhân ngoài phạm vi đó. Bạn hãy đặt câu hỏi về nội dung tài liệu hoặc dự án."
    : "Notebook only answers questions about the selected documents and projects described in those sources. Personal shopping, leisure and unrelated scheduling are outside its scope. Please ask about your documents or project.";
}

export function isClearlyUnrelated(question: string) {
  const plain = plainText(question);
  // A document can itself concern clothing, trips or schedules. Let the model
  // check those explicit source references against evidence instead.
  if (
    /\b(tai lieu|file|pdf|docx|notebook|du an|project|document|source|report|trang|page)\b/.test(
      plain,
    )
  )
    return false;

  return /\b(?:(?:mua|chon|tim|tu van)\s+(?:giup\s+(?:toi|minh)\s+)?(?:quan ao|shop|cua hang)|toi (?:muon|can) di choi|(?:help me )?(?:buy|shop for|choose) (?:some )?(?:clothes|clothing|an outfit)|i want to (?:go out|go shopping))\b/.test(
    plain,
  );
}
