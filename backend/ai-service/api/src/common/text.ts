/** Lowercase, accent-free form used to match Vietnamese and English intent patterns. */
export function plainText(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

/** `plainText` without sentence-final punctuation or repeated whitespace. */
export function plainQuestion(text: string) {
  return plainText(text)
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
}
