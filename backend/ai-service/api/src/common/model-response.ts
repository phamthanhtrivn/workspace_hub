type ModelResponse = {
  content: unknown;
  response_metadata?: Record<string, unknown>;
  tool_calls?: readonly unknown[];
  invalid_tool_calls?: readonly unknown[];
};

export function completedModelText(
  answer: ModelResponse,
  maxCharacters: number,
) {
  if (answer.response_metadata?.finish_reason !== "stop")
    throw new Error("Incomplete model response");
  if (answer.tool_calls?.length || answer.invalid_tool_calls?.length)
    throw new Error("Unexpected model tool response");
  if (
    typeof answer.content !== "string" ||
    !answer.content.trim() ||
    answer.content.length > maxCharacters
  )
    throw new Error("Invalid model response");

  return answer.content;
}
