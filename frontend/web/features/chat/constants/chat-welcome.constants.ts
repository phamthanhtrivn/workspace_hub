export const CHAT_WELCOME_AUTOPLAY_DELAY_MS = 6_000;

export const CHAT_WELCOME_SLIDES = [
  {
    id: "channels",
    title: "A place for every project conversation",
    description:
      "Organize project updates and team discussions in spaces and channels. Mention a teammate when you need their attention.",
    hint: "Choose a space, then select a channel from the sidebar.",
    label: "Spaces and channels",
  },
  {
    id: "direct-messages",
    title: "Your teammates, just a message away",
    description:
      "Ask a quick question or work through an idea in a direct message. Keep everyday conversations close to the rest of your work.",
    hint: "Choose a direct message, or use + to start a conversation.",
    label: "Direct messages",
  },
  {
    id: "threads",
    title: "Keep the details with the discussion",
    description:
      "Reply to a specific message in a thread. Keep follow-up questions together while leaving the main conversation easy to follow.",
    hint: "Use Reply in thread on a message to continue the discussion.",
    label: "Threads and replies",
  },
  {
    id: "shared-content",
    title: "More than a place to send messages",
    description:
      "Share files, create a quick poll, or keep a shared note. Bring the information your team needs into the conversation.",
    hint: "Use the composer tools, or find shared content in conversation details.",
    label: "Files, polls, and notes",
  },
  {
    id: "search",
    title: "Find the message that matters",
    description:
      "Search within a conversation and pin messages you want to return to. Keep decisions, useful links, and important updates easy to find.",
    hint: "Use the search icon or view pinned messages in conversation details.",
    label: "Search and pinned messages",
  },
  {
    id: "calls",
    title: "Some things are easier face to face",
    description:
      "Start a video meeting from a conversation and share your screen when it helps to explain the work. Keep your team connected beyond the message.",
    hint: "Use the video icon at the top of an open conversation.",
    label: "Video meetings",
  },
] as const;

export type ChatWelcomeSlideId = (typeof CHAT_WELCOME_SLIDES)[number]["id"];
