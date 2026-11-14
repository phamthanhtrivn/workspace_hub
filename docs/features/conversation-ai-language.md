# Conversation AI language

This policy applies to AI chat in direct conversations, channels, and threads,
including summaries of attached documents.

- Interface labels, toasts, validation errors, availability feedback, empty-history
  notices, and interrupted-request messages are English.
- Generated answers prioritize an explicit request for English or Vietnamese.
  Otherwise they follow the dominant language of the latest question. Ambiguous
  or evenly mixed questions default to English without a language clarification.
- Document names, document text, and conversation history do not determine the
  response language. Proper names, code, and source quotations retain their text.
- **Summarize with AI** sends an English question and therefore defaults to an
  English summary, including when the attached file has a Vietnamese name.
- Summary headings and excerpt/OCR coverage notes follow the generated answer's
  language. Generated answer text is not translated by the application.

The document-summary model returns an internal JSON envelope with `language`
(`en` or `vi`) and `content`. This is validated before the application adds the
heading and coverage notes; malformed output produces English failure feedback.
The saved chat message and public API remain plain text. Language selection does
not add a model call or retry an unknown provider outcome.

Every ordinary bot question automatically loads up to 30 preceding messages from
the same conversation or thread, including all participants' text messages and
AI Bot answers. Messages are chronological, excluding deleted/recalled messages
and the current question. Inside a thread, only replies with that exact thread
parent ID are loaded; the root message and other chat/thread messages are excluded.
History is capped at 24,000 UTF-8 content bytes and 2,000
characters per message; long messages are shortened. Earlier AI answers are
context for follow-ups, not evidence of participant decisions or commitments.
The history is fetched once per request. Attachment summaries remain scoped to
the selected document and current question.

Deploy the updated Communication service, AI API/worker, and frontend together.
No database migration is required. Existing stored messages and checkpointed
answers are preserved.

Run the maintained AI and Communication fast suites from the repository root:

```powershell
node tests/run-tests.mjs --project backend/ai-service/api
node tests/run-tests.mjs --project backend/communication-service
```

These suites do not provide dedicated coverage of the conversation language
policy. Verify explicit English/Vietnamese requests, follow-up context, attachment
summary language and access revocation against the configured stack before release.
