import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { api } from "@/lib/axios";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { MessageType } from "../../../types/chat.enums";
import { CHAT_MESSAGE_TYPES } from "../../../types/document.constants";
import type {
  ChatMediaResponse,
  ChatMessageResponse,
} from "../../../types/chat.types";
import {
  fetchFollowedThreads,
  getThreadPreview,
} from "../../sidebar/followed-threads-modal";
import ThreadSnippetPreview, {
  formatThreadSnippet,
} from "./thread-snippet-preview";
import { formatThreadReplyCount } from "../../../utils/thread-snippet";

const files: ChatMediaResponse[] = [
  {
    id: "pdf",
    name: "Thesis report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 128,
    fileUrl: "",
  },
  {
    id: "image",
    name: "Architecture.png",
    mimeType: "image/png",
    sizeBytes: 64,
    fileUrl: "",
  },
];
const attachmentMessage: ChatMessageResponse = {
  id: "root",
  senderId: "sender",
  type: MessageType.TEXT,
  content: null,
  createdAt: "2026-11-08T00:00:00Z",
  medias: files,
};
const documentMetadata = {
  name: "Shared thesis.docx",
  type: DocumentItemType.FILE,
  hasPermission: true,
};

test("attachment-only threads identify every attached filename", () => {
  const snippet = formatThreadSnippet(null, attachmentMessage);
  assert.match(snippet.title, /Thesis report\.pdf/);
  assert.match(snippet.title, /Architecture\.png/);
});

test("thread search includes filenames even when the root also contains text", () => {
  const rootMessage = { ...attachmentMessage, content: "Please review" };
  const preview = getThreadPreview({ rootMessage });
  assert.match(preview, /Please review/);
  assert.match(preview, /Thesis report\.pdf/);
  assert.match(preview, /Architecture\.png/);
});

test("shared document threads display the filename instead of the document ID", () => {
  const message = {
    ...attachmentMessage,
    type: CHAT_MESSAGE_TYPES.DOCUMENT,
    content: "private-document-id",
    medias: [],
  };
  const snippet = formatThreadSnippet(
    message.content,
    message,
    documentMetadata,
  );
  assert.match(snippet.title, /Shared thesis\.docx/);
  assert.doesNotMatch(snippet.title, /private-document-id/);
  assert.match(
    getThreadPreview({ rootMessage: message }, documentMetadata),
    /Shared thesis\.docx/,
  );
});

test("unavailable shared documents and missing metadata never expose document IDs", () => {
  const message = {
    ...attachmentMessage,
    type: CHAT_MESSAGE_TYPES.DOCUMENT,
    content: "private-document-id",
  };
  for (const metadata of [
    undefined,
    null,
    { ...documentMetadata, hasPermission: false },
  ]) {
    const snippet = formatThreadSnippet(message.content, message, metadata);
    assert.doesNotMatch(snippet.title, /private-document-id|Shared thesis/);
  }
});

test("recalled roots do not expose their text or attachment names", () => {
  const message = {
    ...attachmentMessage,
    content: "Private discussion",
    recalled: true,
  };
  const preview = getThreadPreview({
    rootMessage: message,
  });
  assert.equal(preview, "Message recalled");
});

test("ordinary JSON containing a title is not mistaken for a task", () => {
  const content = '{"title":"Example JSON"}';
  const snippet = formatThreadSnippet(content, {
    ...attachmentMessage,
    content,
    medias: [],
  });
  assert.equal(snippet.isTask, false);
  assert.equal(snippet.title, content);
});

test("malformed task payload fields remain safe to render", () => {
  const content = '{"taskId":123,"title":{"unexpected":true},"tag":{}}';
  const message = {
    ...attachmentMessage,
    type: MessageType.TASK,
    content,
    medias: [],
  };
  const html = renderToStaticMarkup(
    <ThreadSnippetPreview content={content} message={message} />,
  );
  assert.match(html, /Task Discussion/);
  assert.doesNotMatch(html, /\[object Object\]/);
});

test("task previews preserve titles and task tags", () => {
  const content = '{"taskId":"12345678-abcd","title":"Review thesis"}';
  const snippet = formatThreadSnippet(content, {
    ...attachmentMessage,
    type: MessageType.TASK,
    content,
  });
  assert.equal(snippet.isTask, true);
  assert.equal(snippet.title, "Review thesis");
  assert.equal(snippet.tag, "[Task #12345678]");
});

test("polls, notes and meetings have meaningful previews", () => {
  const base = { ...attachmentMessage, medias: [] };
  const messages: ChatMessageResponse[] = [
    {
      ...base,
      type: MessageType.POLL,
      poll: {
        id: "poll",
        messageId: base.id,
        title: "Pick a time",
        multipleChoice: false,
        allowAddOptions: false,
        anonymous: false,
        createdBy: base.senderId,
        createdAt: base.createdAt,
        options: [],
      },
    },
    {
      ...base,
      type: MessageType.NOTE,
      note: {
        id: "note",
        messageId: base.id,
        title: "Meeting notes",
        content: "",
        createdBy: base.senderId,
        createdAt: base.createdAt,
      },
    },
    {
      ...base,
      type: MessageType.MEETING,
      meeting: {
        id: "meeting",
        roomName: "review",
        joinToken: "",
        title: "Thesis review",
        status: "ENDED",
        createdBy: base.senderId,
        hostId: base.senderId,
      },
    },
  ];
  for (const message of messages) {
    assert.match(
      formatThreadSnippet(null, message).title,
      new RegExp((message.poll || message.note || message.meeting)!.title),
    );
  }
});

test("thread snippets render text and filenames together", () => {
  const html = renderToStaticMarkup(
    <ThreadSnippetPreview content="Review these" message={attachmentMessage} />,
  );
  assert.match(html, /Review these/);
  assert.match(html, /Thesis report\.pdf/);
  assert.match(html, /Architecture\.png/);
});

test("followed thread API failures are not presented as empty results", async (context) => {
  const adapter = api.defaults.adapter;
  context.after(() => {
    api.defaults.adapter = adapter;
  });
  api.defaults.adapter = async (config) => ({
    config,
    status: 200,
    statusText: "OK",
    headers: {},
    data: { success: false, data: [] },
  });
  await assert.rejects(fetchFollowedThreads);
});

test("reply counts use singular and plural labels", () => {
  assert.equal(formatThreadReplyCount(0), "0 replies");
  assert.equal(formatThreadReplyCount(1), "1 reply");
  assert.equal(formatThreadReplyCount(2), "2 replies");
});

test("legacy task threads preserve their title without the serialized prefix", () => {
  const snippet = formatThreadSnippet(
    "📋 Discussion Thread: Review report [Task #12345678-abcd]",
  );
  assert.equal(snippet.title, "Review report");
  assert.equal(snippet.tag, "[Task #12345678]");
});
