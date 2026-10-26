export function composeMessageText(
  message: string,
  interimMessage = "",
): string {
  return [message.trim(), interimMessage.trim()].filter(Boolean).join(" ");
}
