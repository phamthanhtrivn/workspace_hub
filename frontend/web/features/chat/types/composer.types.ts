import type { SendSocketMessageMedia } from "./chat-socket.types";

/** True means the server confirmed the message/edit; false retains the draft. */
export type ComposerSendHandler = (
  content: string,
  media?: SendSocketMessageMedia[],
  mentions?: string[],
) => Promise<boolean>;
