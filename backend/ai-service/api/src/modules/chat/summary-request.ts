export function isNotebookSummaryRequest(question: string): boolean {
  const text = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
  const request = text
    .replace(/^(?:hay|vui long|ban co the|giup toi|giup minh)\s+/, "")
    // A trailing recipient (including a mistyped name/pronoun) does not change
    // an otherwise explicit request to summarize the selected documents.
    .replace(/\s+(?:cho|giup)(?:\s+[a-z]+){1,2}$/, "");

  return (
    /^doc (?:tat ca|toan bo) (?:cac )?(?:tai lieu|file|nguon)(?: nay| da chon| trong notebook)?$/.test(
      request,
    ) ||
    /^(?:doc va )?tom tat (?:lai )?(?:(?:tat ca|toan bo|cac|nhung) )?(?:cac )?(?:file|tai lieu|nguon)(?: nay| da chon| trong notebook)?$/.test(
      request,
    ) ||
    /^doc (?:tat ca|toan bo)(?: (?:cac )?(?:tai lieu|file|nguon))? va tom tat$/.test(
      request,
    ) ||
    /^(?:please )?summari[sz]e (?:all |the |these |selected )*(?:files|documents|sources)(?: for me)?$/.test(
      text,
    )
  );
}
