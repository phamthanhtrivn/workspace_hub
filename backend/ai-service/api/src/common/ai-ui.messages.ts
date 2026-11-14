// Service feedback only. User content, prompts and generated answers retain their language.
export const AI_UI_MESSAGES = {
  ANALYZING_WORK: "Analyzing your tasks...",
  INVALID_INPUT: "Invalid input.",
  PROCESSING_INTERRUPTED: "Processing was interrupted. You can retry.",
  MEETING_SUMMARY_FAILED:
    "Unable to summarize this recording. Check the configuration or retry. Completed steps have been saved.",
  PROCESSING_QUEUE_FAILED: "Unable to queue processing. Please try again.",
  PROVIDER_HTTP: (status: number) => `The AI provider returned HTTP ${status}.`,
  RESPONSE_TRUNCATED: (maxTokens: number) =>
    `The response reached the ${maxTokens}-token output limit and is incomplete. Ask about a more specific section.`,
  RAG_DEPENDENCY_FAILED: (code: string, status: number) =>
    `${code}: The RAG worker could not process the document (HTTP ${status}). Check the model, Qdrant and memory.`,
  NO_PREVIOUS_QUESTION:
    "You have not asked another question in this notebook yet.",
  FIRST_QUESTION_HIDDEN:
    "Your first question refers to a source that is not selected or has changed. It cannot be shown within the current source scope.",
  FIRST_QUESTION: (content: string) =>
    `Your first question in this notebook was:\n\n${JSON.stringify(content)}`,
  UNCITED_CONTENT:
    "\n\nNote: Some sections do not have direct citations. Check them against the sources before using them.",
  NEW_CONVERSATION: "New conversation",
  PREVIOUS_CONVERSATION: "Previous conversation",
  REQUEST_PROCESSED:
    "This request has already been processed. Reload the conversation.",
  QUESTION_RUNNING: "Another question is being processed.",
  REQUEST_RATE_LIMIT: "Too many requests. Please try again in a minute.",
  REQUEST_CANCELED: "The request was canceled.",
  TOO_MANY_HISTORY_PROJECTS: "Too many projects in the conversation history.",
  PROJECT_FORBIDDEN: "You no longer have access to this project.",
  PROJECT_ACCESS_CHANGED: "Project access has changed.",
  WORK_ASSISTANT_DISABLED: "Work Assistant is not enabled or configured.",
  WORK_ASSISTANT_UNCONFIGURED: "Work Assistant is not configured.",
  HIDDEN_PROJECT_CONTENT:
    "Content was hidden because project access has changed.",
  FETCHING_CONTEXT: "Fetching the latest data...",
  WORK_TIMEOUT: "The AI request timed out. Please try again later.",
  WORK_STOPPED: "The request was stopped.",
  WORK_ACCESS_CHANGED: "Access has changed. Please reopen the assistant.",
  WORK_QUOTA: "The AI request limit has been reached. Please try again later.",
  WORK_FAILED:
    "Unable to answer right now. Please try again. The assistant has not changed your work data.",
  DATA_UNAVAILABLE: "The data source is unavailable.",
  SOURCE_SIZE_CHANGED: "The source version size does not match.",
  SOURCE_SIZE_MISMATCH: "The source version size does not match.",
  SOURCE_CHANGED: "The source has changed.",
  SOURCE_RESELECT: "The source has changed. Select the document again.",
  SOURCE_NEW_VERSION: "The source has changed. Add the new version.",
  SOURCE_ACCESS_CHANGED: "Source access or version has changed.",
  SOURCE_PROCESSING: "The source is being processed.",
  SOURCE_REMOVED_OR_PROCESSING: "The source was removed or is being processed.",
  INDEX_FAILED:
    "INDEX_DEPENDENCY_FAILED: Unable to download or process the source. Check Document Service, the RAG worker and memory, then retry when available.",
  INDEX_INTERRUPTED:
    "INDEX_INTERRUPTED: Processing was interrupted. Retry to index this source.",
  CHAT_BUSY:
    "You have too many active requests. Wait for or cancel the previous response.",
  CHAT_ALREADY_RUNNING:
    "This notebook is already generating a response or the request has already been submitted.",
  CHAT_CANCELED: "The request was canceled.",
  INVALID_CLARIFICATION: "The clarification response is invalid.",
  ANSWER_TOO_LONG: "The response is too long.",
  SOURCE_COUNT: "Select between 1 and 5 sources.",
  SOURCE_NOT_READY:
    "The source is not ready or does not belong to this notebook.",
  CITATIONS_INVALID:
    "The AI response is missing valid source citations. Please try again.",
  NOTEBOOK_DISABLED: "Notebook AI is not enabled.",
  DATA_SIZE_LIMIT: "The data source exceeds the size limit.",
  SOURCE_URL_UNAVAILABLE: "Unable to get the original file link.",
  SOURCE_DOWNLOAD_FAILED:
    "Unable to download the original file for validation. Please try again.",
  SOURCE_FILE_MISMATCH:
    "The file exceeds 20 MiB or its version size does not match.",
  UPLOAD_BUSY: "Another file is being validated. Please try again shortly.",
  UPLOAD_DECLARED_SIZE:
    "The file exceeds its declared size or the 20 MiB limit.",
  UPLOAD_SIZE_MISMATCH: "The file size does not match.",
  UPLOAD_READ_FAILED: "Unable to read the uploaded file.",
  UPLOAD_ABORTED: "The file upload was interrupted.",
  UPLOAD_TIMEOUT: "The file upload timed out.",
  UPLOAD_TYPE:
    "Upload PDF, DOCX, TXT or MD files, or PNG/JPEG/WebP images when image analysis is enabled. File names must not exceed 300 characters.",
  UPLOAD_EMPTY: "The file is empty or its size is invalid.",
  UPLOAD_FILE_LIMIT: "The file exceeds 20 MiB. Split it into smaller files.",
  UPLOAD_SOURCE_LIMIT:
    "A notebook supports up to 5 files. Remove a source before uploading.",
  UPLOAD_TOTAL_LIMIT:
    "The notebook exceeds 50 MiB. Reduce the number or size of its files.",
  CURRENT_VERSION_REQUIRED: "Only the current document version is supported.",
  UPLOAD_CONTENT_TYPE: "Send the file as application/octet-stream.",
  RAG_UNAVAILABLE: "The RAG worker is unavailable or timed out.",
  PDF_PAGE_LIMIT:
    "The PDF exceeds 100 pages. Split it into smaller files before uploading.",
  PDF_ENCRYPTED:
    "The PDF is encrypted or password-protected. Use an unencrypted copy.",
  PDF_OCR_REQUIRED:
    "The PDF contains scanned pages without a text layer. Run OCR before uploading.",
  DOCX_EXPANDED_LIMIT:
    "The DOCX exceeds 100 MiB after decompression. Reduce its images or split the file.",
  VISUAL_PAGE_LIMIT:
    "The file exceeds 24 pages/images requiring Vision or 16 MiB of extracted images. Split it into smaller files.",
  IMAGE_DIMENSIONS:
    "The image exceeds 20 million pixels, is too small, or its extracted data is too large. Resize it or split the pages.",
  IMAGE_INVALID:
    "The image is corrupt or its format does not match. Use a valid PNG, JPEG or WebP image.",
  IMAGE_ANIMATED: "Animated images are not supported. Use a still image.",
  OCR_TIMEOUT: "OCR timed out. Split the document into fewer pages.",
  VISUAL_DISABLED: "Image analysis is not enabled on the server.",
  FILE_INVALID:
    "The file is corrupt, empty or unreadable. Check the document or image format.",
  RAG_FALLBACK_PENDING:
    "RAG_FALLBACK_PENDING: The local index is being prepared in the background. Please try again shortly.",
  RAG_BUSY:
    "RAG is processing another file. The AI source has not been added; please try again shortly.",
  DOCUMENT_KEY_MISMATCH:
    "The AI and Document Service internal credentials do not match.",
  DOCUMENT_VERIFY_FAILED: "Unable to verify document access.",
  DOCUMENT_FORBIDDEN: "The source was removed or access was revoked.",
  DOCUMENT_UNAVAILABLE: "Document Service is unavailable.",
  ORIGINAL_ACCESS_UNVERIFIED:
    "Unable to verify access to the original document.",
  ORIGINAL_FORBIDDEN:
    "The original document was removed or you do not have read access.",
  ORIGINAL_UNAVAILABLE:
    "Document Service is unavailable for file verification.",
  PROVIDER_INCOMPLETE: "The AI provider did not complete the response.",
  AI_SCOPE_MISSING: "The AI did not determine the question scope.",
  AI_STREAM_INTERRUPTED: "The AI connection ended before completion.",
  AI_CLARIFICATION_INCOMPLETE:
    "The AI did not complete the clarification response.",
  MINUTE_QUOTA:
    "The AI per-minute request limit has been reached. Please try again later.",
  VISION_DAILY_QUOTA:
    "VISION_DAILY_QUOTA: Today's image-reading budget has been reached. It resets at 00:00 UTC (07:00 Vietnam time).",
  MODEL_DAILY_QUOTA:
    "MODEL_DAILY_QUOTA: Today's AI request limit has been reached. It resets at 00:00 UTC (07:00 Vietnam time).",
  MODEL_INPUT_BUDGET:
    "MODEL_INPUT_BUDGET: This request exceeds the token budget. Reduce its content or split it into smaller requests.",
  IMAGE_CHECKSUM: "The extracted image checksum does not match.",
  IMAGE_SOURCE_CHANGED:
    "The source was removed or changed during image analysis.",
  VISION_IMAGE_INVALID: "The extracted image is invalid.",
  VISION_INCOMPLETE:
    "VISION_INCOMPLETE: Image analysis did not finish. Retry or split the document into clearer pages.",
} as const;
