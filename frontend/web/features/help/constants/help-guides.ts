import type { HelpArticle } from "../types";

export const HELP_GUIDES: readonly HelpArticle[] = [
  {
    id: "plan-today",
    topic: "dashboard",
    title: "Find your next task",
    keywords: "getting started home today overdue deadline",
    description:
      "Start with today's schedule, outstanding tasks and upcoming meetings.",
    steps: [
      "Open Dashboard to review your timeline and task lists.",
      "Open a task to check its source, due date and available actions.",
      "Use Calendar to plan time, or Pomodoro to focus on an eligible task.",
    ],
    note: "Personal tasks and assigned project tasks keep their original context and permissions.",
  },
  {
    id: "work-assistant",
    topic: "dashboard",
    relatedTopics: ["calendar", "projects"],
    title: "Ask AI about your work",
    keywords: "assistant planning priority schedule history chat retry",
    description:
      "Use AI Assistant on Dashboard, Calendar or Projects to understand tasks and schedules.",
    steps: [
      "Select AI Assistant in the bottom-right corner of a supported page.",
      "Ask a specific question, such as which tasks are due soon or when you have time to focus.",
      "Check the answer against the linked work. Use conversation history to return to an earlier discussion.",
    ],
    note: "Opening the panel does not generate an answer. Availability depends on your settings, permissions and the configured AI service. Failed requests require an explicit retry.",
  },
  {
    id: "project-tasks",
    topic: "projects",
    title: "Plan and track a project",
    keywords:
      "board list gantt kanban assignee priority deadline members invite",
    description:
      "Turn shared work into tasks with owners, deadlines and supporting context.",
    steps: [
      "Open or create a project, then add a task.",
      "Set its assignee, dates, status and priority. Add a description or checklist where needed.",
      "Switch between the project's available views to review the board, list or schedule.",
      "Open Members to manage collaboration when your project role allows it.",
    ],
    note: "Available actions depend on your project role. A task's details remain connected across views.",
  },
  {
    id: "project-files",
    topic: "projects",
    title: "Add files to a project task",
    keywords: "attachment upload my files copy documents",
    description:
      "Choose between uploading a file, copying a personal document and attaching a project file.",
    steps: [
      "Open the task's documents section.",
      "Choose Upload for a local file, My Files for an accessible personal/shared document, or Project for a file already in this project.",
      "Select the files and confirm. Imported personal documents become independent files in Project Documents.",
    ],
    note: "Removing a task attachment does not delete the project file. Deleting that project file can make its task attachments unavailable.",
  },
  {
    id: "calendar-plan",
    topic: "calendar",
    title: "Schedule personal and team work",
    keywords: "event task attendees invite reminder timezone",
    description:
      "Review commitments and project tasks together while keeping their source clear.",
    steps: [
      "Open Calendar and choose a day, week, month or agenda view.",
      "Create an event or personal task, then set its dates and reminders.",
      "For events, add attendees when you want to invite others. Open a project task to edit it within your permissions.",
    ],
    note: "Calendar uses your account timezone. Open event details to confirm a date or meeting time before changing it.",
  },
  {
    id: "calendar-repeat",
    topic: "calendar",
    title: "Edit or delete a recurring event",
    keywords: "repeat series occurrence following recurrence",
    description: "Choose how much of the series your change should affect.",
    steps: [
      "Open the occurrence you want to change.",
      "Choose Edit or Delete and read the recurrence options.",
      "Select the intended scope, such as this occurrence or the series, before confirming.",
    ],
    note: "Deleting a single occurrence and deleting a series have different effects. Review the confirmation before continuing.",
  },
  {
    id: "focus-session",
    topic: "pomodoro",
    title: "Start a focus session",
    keywords: "timer break audio ambient history study productivity",
    description:
      "Give one task your attention and keep a record of your focus time.",
    steps: [
      "Open Pomodoro and select a task from the Calendar tasks or Project tasks panel, or choose Free focus.",
      "Review Timer settings, then start the centered timer. You can add ambient audio with Focus sounds.",
      "Use the floating timer while working elsewhere in the workspace. Use Stop & save before changing the selected task.",
      "Return to History & reports to filter a date range and review Session history or Daily stats.",
    ],
    note: "A focus session records time; it does not automatically complete the linked task.",
  },
  {
    id: "chat-conversation",
    topic: "messages",
    title: "Keep a conversation organized",
    keywords: "space channel direct message dm thread reaction poll note",
    description:
      "Use channels for a topic, direct messages for a person and threads for follow-ups.",
    steps: [
      "Open Messages and select a Space channel or direct conversation.",
      "Send a message, share an attachment, or use the composer's available note and poll actions.",
      "Reply in a thread to keep related follow-ups together.",
      "Mention a person to draw their attention. In a default channel, @All addresses the Space; other channels use @Channel.",
    ],
    note: "Group mentions notify eligible members and exclude the sender. Private channels and conversations keep their access boundaries.",
  },
  {
    id: "chat-ai",
    topic: "messages",
    title: "Ask AI Bot or summarize an attachment",
    keywords: "assistant document summary generate again english vietnamese",
    description:
      "Ask a question in the conversation or work with a specific attached document.",
    steps: [
      "Send a new message containing @AI Bot and your question in a channel, direct conversation or thread.",
      "For an attachment, choose Summarize with AI from its available actions.",
      "Open the document summary when it is ready. Use Generate again only when you want a fresh generation.",
    ],
    note: "Mentions inside code or quotes do not activate the bot. Editing an old message to add a mention does not start a request. Ordinary bot questions can use recent messages from that conversation or thread; attachment summaries focus on the selected file.",
  },
  {
    id: "meeting-join",
    topic: "meetings",
    title: "Schedule or join a meeting",
    keywords: "video call microphone camera screen share link devices",
    description:
      "Check your devices, meet with your team and share the context on screen.",
    steps: [
      "Open Meetings to schedule a meeting or join one you can access.",
      "Check your microphone and camera in the device preview, then join.",
      "Use the meeting controls for audio, video, screen sharing, participants and chat.",
    ],
    note: "Your browser may ask for microphone, camera or screen-sharing permission. Admission and meeting actions depend on the host's settings and your role.",
  },
  {
    id: "meeting-recording",
    topic: "meetings",
    title: "Review a recording and its AI summary",
    keywords: "transcript speech action items decisions replay",
    description:
      "Return to a recording and generate a summary when that feature is available.",
    steps: [
      "Open a recording you have permission to view.",
      "If you own the recording and AI summaries are available, select Summarize with AI.",
      "Wait for processing, then review the summary and verify decisions against the recording.",
    ],
    note: "People with recording access can read its saved summary. AI summarizes transcribed speech; it does not identify speakers from mixed audio. Processing depends on recording and AI service availability.",
  },
  {
    id: "documents-organize",
    topic: "documents",
    title: "Organize and find your documents",
    keywords: "upload folder version search download starred trash restore",
    description:
      "Keep personal files, shared documents and project files easy to find.",
    steps: [
      "Open Documents and select My files, Shared, Starred or Trash as appropriate.",
      "Browse folders or search by name. Use the view and sort controls to scan results.",
      "Open a file for its preview, versions and available actions. Use New in My files to upload or create a folder.",
    ],
    note: "The usual Documents policy is 10 MiB per file and 5 GiB per account. A shared file's available actions follow your granted access.",
  },
  {
    id: "documents-copy",
    topic: "documents",
    relatedTopics: ["messages", "meetings", "projects", "ai"],
    title: "Share access or send a file copy",
    keywords:
      "permissions public link chat meeting project snapshot zip folder attachment",
    description:
      "Choose the right way to share a document for the destination.",
    steps: [
      "Use document sharing to grant access or manage a public link when permitted.",
      "Choose Send a copy to send an independent file to a channel, direct conversation, joined live meeting chat or writable project.",
      "Select a destination, optionally add an introduction or project task, and confirm.",
    ],
    note: "Copies keep the accepted file version even if the original changes or is deleted. Original access grants and public links do not follow a copy. Folders can be exported as ZIP attachments to chat; Projects and Notebooks accept individual files.",
  },
  {
    id: "notebook-start",
    topic: "ai",
    title: "Research with Notebook AI",
    keywords:
      "getting started source upload drag drop pdf docx txt markdown image citation research summary",
    description:
      "Ask questions grounded in the sources you add to a personal notebook.",
    steps: [
      "Open Notebook AI and create or open a notebook.",
      "Add sources by dragging files into the upload area or selecting accessible files from Documents.",
      "Wait for sources to finish indexing, then select the ones to include in your question.",
      "Ask a focused question and open citations to inspect the supporting source material.",
    ],
    note: "Each notebook supports up to 5 sources, 20 MiB per file and 50 MiB total. PDF, DOCX, TXT, Markdown and supported image files are accepted. Notebook sources are private copies, independent of their originals.",
  },
  {
    id: "notebook-notes",
    topic: "ai",
    title: "Save research notes",
    keywords: "studio markdown editor summary answer",
    description:
      "Keep useful findings alongside your notebook's sources and conversation.",
    steps: [
      "Open the notebook's Studio or notes panel.",
      "Create a note and give it a clear title.",
      "Write and format the content with the Markdown editor, then save it.",
    ],
    note: "On smaller screens, switch between Sources, Chat and Studio. Review cited material before relying on an AI answer.",
  },
  {
    id: "account-preferences",
    topic: "account",
    title: "Adjust your workspace preferences",
    keywords:
      "profile avatar password security theme dark light timezone notification settings ai",
    description:
      "Use Settings to manage your profile and available workspace preferences.",
    steps: [
      "Open your user menu and select Settings, or use the Settings button in workspace navigation.",
      "Choose the relevant section for your profile, appearance, notifications, password, signed-in sessions or Pomodoro settings.",
      "Review and save changes where the section requires it. Sign out is at the bottom of the Settings sidebar when you want to leave the account.",
    ],
    note: "The app shortcut switch in Help is saved in this browser. It does not change standard typing, editor formatting or your operating system's shortcuts.",
  },
  {
    id: "notifications",
    topic: "account",
    title: "Return to work from a notification",
    keywords: "bell unread mention invitation alert badge",
    description:
      "Find invitations, mentions and updates without searching through every module.",
    steps: [
      "Open the notification bell in the workspace header.",
      "Select a notification to open its related task, conversation, invitation or event.",
      "If the destination is unavailable, check whether the content still exists and whether you still have access.",
    ],
    note: "A notification does not grant permission to its destination. Some updates depend on your notification settings.",
  },
];
