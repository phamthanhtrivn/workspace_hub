import { plainQuestion } from "../../common/text";

export function isFirstQuestionRequest(question: string): boolean {
  const plain = plainQuestion(question);

  return /^(?:cau (?:hoi )?dau tien (?:toi (?:da )?hoi|cua toi)(?: la gi)?|toi (?:da )?hoi (?:gi dau tien|cau gi dau tien)|what was (?:my first question|the first question i asked))$/.test(
    plain,
  );
}
