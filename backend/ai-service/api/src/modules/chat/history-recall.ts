export function isFirstQuestionRequest(question: string): boolean {
  const plain = question
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[?.!]+$/, "")
    .replace(/\s+/g, " ");

  return /^(?:cau (?:hoi )?dau tien (?:toi (?:da )?hoi|cua toi)(?: la gi)?|toi (?:da )?hoi (?:gi dau tien|cau gi dau tien)|what was (?:my first question|the first question i asked))$/.test(
    plain,
  );
}
