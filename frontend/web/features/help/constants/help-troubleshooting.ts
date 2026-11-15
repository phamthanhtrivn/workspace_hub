import type { HelpArticle } from "../types";

export const HELP_TROUBLESHOOTING: readonly HelpArticle[] = [
  {
    id: "loading-failed",
    topic: "dashboard",
    relatedTopics: [
      "projects",
      "calendar",
      "pomodoro",
      "messages",
      "meetings",
      "documents",
      "ai",
      "account",
    ],
    title: "A page or list will not load",
    keywords: "network offline retry connection error empty",
    description: "A loading error and an empty result mean different things.",
    steps: [
      "Check your internet connection and use the affected section's Retry action.",
      "If results are empty, clear search and filters before retrying.",
      "If an access error appears, confirm that you are signed in to the intended account and still belong to the project or Space.",
    ],
    note: "Reloading the page may discard unsaved form content. Copy an unsaved draft before reloading.",
  },
  {
    id: "missing-action",
    topic: "projects",
    relatedTopics: ["messages", "documents", "meetings"],
    title: "An action is missing or disabled",
    keywords:
      "permission role viewer editor owner member invitation access denied",
    description:
      "Actions reflect your role and the current state of the content.",
    steps: [
      "Read any explanation beside the action or in its tooltip.",
      "Check that your project or Space invitation has been accepted.",
      "Ask the owner or administrator to confirm your role if you need additional access.",
    ],
  },
  {
    id: "ai-unavailable",
    topic: "ai",
    relatedTopics: [
      "dashboard",
      "projects",
      "calendar",
      "messages",
      "meetings",
    ],
    title: "AI is unavailable or a response stopped",
    keywords:
      "assistant bot summary quota failed network retry generation service",
    description: "Check the displayed status before sending another request.",
    steps: [
      "Read the availability or quota message. If AI is disabled for your account or workspace, ask the administrator to confirm availability.",
      "For Work Assistant, use Retry or reopen the panel after service recovery; failed reads do not retry automatically.",
      "If a generation is still running, wait for its status to resolve. Use the offered retry action after a confirmed failure.",
      "For Notebook AI, confirm that sources are ready before asking again.",
    ],
    note: "A retry may recover an already saved answer. Generate again explicitly requests a new attachment summary. AI features require configured services and the relevant access.",
  },
  {
    id: "source-failed",
    topic: "ai",
    title: "A notebook source cannot be added",
    keywords:
      "upload size format indexing pdf scanned image limit storage drag drop",
    description:
      "Check the file and notebook limits, then review the source's failure message.",
    steps: [
      "Use a supported, non-empty file: PDF, DOCX, TXT, MD, PNG, JPEG or WebP.",
      "Keep within 5 sources, 20 MiB per file and 50 MiB total per notebook.",
      "PDFs support up to 100 pages. A file can contain up to 100,000 tokens and 24 scanned pages or images requiring image analysis.",
      "Remove an unused source or split an oversized document, then try adding the file again.",
    ],
  },
  {
    id: "copy-failed",
    topic: "documents",
    title: "A file copy or chat send failed",
    keywords: "attachment upload retry duplicate zip download size",
    description:
      "Check access, destination permissions and the file size before retrying.",
    steps: [
      "Confirm that you can download the original and still have permission to send to the destination.",
      "Chat and Project files use a 10 MiB file limit. A folder's finished ZIP must also fit the chat limit.",
      "Use Retry in the same flow when offered. Confirmed deliveries are reused to avoid duplicate sends.",
    ],
    note: "Expired preparations require a fresh attempt. Existing accepted copies follow destination access rather than the original file's access.",
  },
  {
    id: "meeting-devices",
    topic: "meetings",
    title: "Microphone, camera or screen sharing is not working",
    keywords: "video audio sound permission devices browser call",
    description: "Check browser permissions and your selected devices.",
    steps: [
      "Confirm the microphone or camera is enabled in the meeting controls.",
      "Check this site's device permissions in your browser and select the correct device.",
      "Close other apps using the device. For screen sharing, select a screen, window or tab in the browser's picker.",
    ],
    note: "Meeting admission and recording controls also depend on the host and your role.",
  },
  {
    id: "calendar-time",
    topic: "calendar",
    title: "An event appears at the wrong time",
    keywords: "timezone daylight recurring date schedule invitation",
    description:
      "Review your timezone and the event's recurrence before changing the schedule.",
    steps: [
      "Compare the event's displayed time with your account timezone. Refresh Calendar after any account timezone change.",
      "Open the event details to confirm its dates and recurrence.",
      "When editing a recurring event, choose the intended occurrence or series scope.",
    ],
  },
  {
    id: "shortcut-not-working",
    topic: "account",
    title: "A keyboard shortcut does not respond",
    keywords:
      "keyboard disabled typing input mac windows browser help navigation",
    description:
      "App shortcuts pause while you type, compose text or use an overlay.",
    steps: [
      "Click outside text fields and close open menus or dialogs.",
      "Open Keyboard shortcuts in Help and check that App shortcuts is enabled.",
      "Use page-specific shortcuts on their matching page. Press G, then a destination key within one second to navigate.",
      "Use the Windows / Linux or macOS display for the correct modifier keys.",
    ],
    note: "The ? Help shortcut remains available when app shortcuts are off. Browser extensions or operating system shortcuts can take priority.",
  },
];
