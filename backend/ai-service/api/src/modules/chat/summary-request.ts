import { plainQuestion } from "../../common/text";

const SOURCE_SELECTION =
  "(?:(?:tat ca|toan bo|cac|nhung|noi dung|cua) )*(?:file|tai lieu|nguon)(?: nay| da chon| trong notebook(?: nay)?)?";
const SUMMARY_REQUEST = new RegExp(
  `^(?:doc va )?tom tat (?:lai )?${SOURCE_SELECTION}$`,
);

export function isNotebookSummaryRequest(question: string): boolean {
  const text = plainQuestion(question);
  const request = text
    .replace(/^(?:(?:hay|vui long|ban co the|giup toi|giup minh)\s+)+/, "")
    .replace(/^cho (?:toi|minh) (?:mot )?(?:ban )?/, "")
    // A trailing recipient (including a mistyped name/pronoun) does not change
    // an otherwise explicit request to summarize the selected documents.
    .replace(/\s+(?:cho|giup)(?:\s+[a-z]+){1,2}$/, "");

  return (
    /^doc (?:tat ca|toan bo) (?:cac )?(?:tai lieu|file|nguon)(?: nay| da chon| trong notebook)?$/.test(
      request,
    ) ||
    SUMMARY_REQUEST.test(request) ||
    /^doc (?:tat ca|toan bo)(?: (?:cac )?(?:tai lieu|file|nguon))? va tom tat$/.test(
      request,
    ) ||
    /^(?:please )?(?:summari[sz]e |(?:give me|provide|write|create) (?:a |the )?summary of )(?:(?:all|the|these|selected) )*(?:files|documents|sources)(?: for me)?$/.test(
      text,
    )
  );
}
