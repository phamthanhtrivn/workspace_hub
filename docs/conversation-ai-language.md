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

Deploy the updated Communication service, AI API/worker, and frontend together.
No database migration is required. Existing stored messages and checkpointed
answers are preserved.

Focused checks from the repository root:

```powershell
node --test backend/security-tests/conversation-language.test.mjs
```

The suite uses a mocked model and isolated service responses. It verifies prompt
policy, question propagation, English service feedback, bilingual presentation,
authorization checks, and single-call generation without contacting a provider.
