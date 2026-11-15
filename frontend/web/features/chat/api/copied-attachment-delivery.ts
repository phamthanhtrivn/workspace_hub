import { store } from "@/store/store";
import { fileCopyAttempt } from "@/features/documents/utils/file-copy-attempt";

/** Only copy-backed sends opt in; ordinary composer behavior remains unchanged. */
export async function copiedAttachmentDelivery<
  Payload extends { clientRequestId?: string; medias?: { s3Key: string }[] },
  Result extends { success: boolean },
>(
  context: string,
  payload: Payload,
  send: (payload: Payload) => Promise<Result>,
): Promise<Result> {
  if (
    payload.clientRequestId ||
    !payload.medias?.some((media) =>
      /\/copy_[a-f0-9-]{36}_\d+$/i.test(media.s3Key),
    )
  )
    return send(payload);
  const actorId = store.getState().auth.userId;
  if (!actorId)
    throw new Error("Sign in again before sending this attachment.");
  const attempt = await fileCopyAttempt(
    actorId,
    `${context}:${JSON.stringify(payload)}`,
    payload.medias.map((media) => ({ id: media.s3Key })),
  );
  if (store.getState().auth.userId !== actorId)
    throw new Error("Your account changed.");
  const result = await send({
    ...payload,
    clientRequestId: attempt.operationId,
  });
  if (store.getState().auth.userId !== actorId)
    throw new Error("Your account changed.");
  if (result.success) attempt.complete();

  return result;
}
