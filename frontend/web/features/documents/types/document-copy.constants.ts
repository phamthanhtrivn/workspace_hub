import { Hash, MessageCircle } from "lucide-react";

export const DOCUMENT_COPY_TABS = [
  { value: "channel", label: "Channels", icon: Hash },
  { value: "direct", label: "DMs", icon: MessageCircle },
] as const;

export const DOCUMENT_COPY_MESSAGES = {
  accountChanged: "Your account changed. Reopen this dialog before sending.",
  versionUnavailable: "The current file version could not be verified.",
  failed: "Unable to send this copy. Please try again.",
  locked:
    "Retry sends only to failed destinations. To change recipients or the message, close and reopen this dialog.",
  dmHelp:
    "Choose one or more existing DMs. Each person receives a separate copy.",
  dmEmpty: "You do not have any direct messages yet.",
  dmNoMatches: "No matching people in your direct messages.",
  channelHelp: "Choose one space, then one channel you can send messages to.",
  channelEmpty: "No channels available for sending in this space.",
  channelNoMatches: "No matching channels in this space.",
  spaceEmpty: "You do not belong to any spaces yet.",
  targetsFailed: "Could not load destinations. Try again.",
  sent: (count: number) =>
    count === 1 ? "Copy sent." : `Copies sent to ${count} DMs.`,
} as const;
