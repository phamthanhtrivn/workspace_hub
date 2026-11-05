export function isNotebookSummaryRequest(question: string): boolean {
  const text = question
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
  return (
    /^(?:(?:hay|vui long|ban co the|giup toi|giup minh) )?tom tat (?:lai )?(?:(?:tat ca|toan bo|cac|nhung) )?(?:cac )?(?:file|tai lieu|nguon)(?: nay| da chon| trong notebook)?(?: cho toi| cho minh| giup toi| giup minh)?$/.test(
      text,
    ) ||
    /^(?:please )?summari[sz]e (?:all |the |these |selected )*(?:files|documents|sources)(?: for me)?$/.test(
      text,
    )
  );
}
