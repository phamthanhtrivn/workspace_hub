export const DOCUMENT_CONSTANTS = {
  S3_FOLDER: 'documents',
  DEFAULT_MIME_TYPE: 'application/octet-stream',

  // ── ZIP Download ─────────────────────────────────────────────────────────
  /** Compression level for archiver ZIP (0=no compression, 9=max) */
  ZIP_COMPRESSION_LEVEL: 6,
  ZIP_CONTENT_TYPE: 'application/zip',
  ZIP_CONTENT_DISPOSITION_PREFIX: 'attachment',

  // ── Fallback / Default Values ──────────────────────────────────────────
  /** Placeholder when uploader's email cannot be resolved from shares */
  FALLBACK_UPLOADER_EMAIL_PRIVATE: 'Người dùng khác',
  /** Placeholder for anonymous uploaders on public shared documents */
  FALLBACK_UPLOADER_EMAIL_PUBLIC: 'Khách truy cập',
  /** Empty s3Key sentinel when a version's key is not yet set */
  FALLBACK_S3_KEY: '',
  /** UUID used as uploadedBy for anonymous public uploads */
  ANONYMOUS_USER_ID: '00000000-0000-0000-0000-000000000000',
  /** Initial version number for new document items */
  INITIAL_VERSION_NUMBER: 1,
  /** ID representing the original version of a document */
  ORIGINAL_VERSION_ID: 'original',

  // ── Filename Sanitisation Regex ───────────────────────────────────────
  /**
   * Strips characters that are invalid in file/folder names on common OSes.
   * Covers: / \ ? % * : | " < >
   */
  REGEX_INVALID_FILENAME_CHARS: /[/\\?%*:|"<>]/g,
  /**
   * Strips Unicode combining diacritical marks (applied after NFD decomposition).
   * Used to produce ASCII-safe filenames for Content-Disposition headers.
   */
  REGEX_DIACRITICS: /[\u0300-\u036f]/g,
  /**
   * Strips any character outside the printable ASCII range (U+0020–U+007E).
   * Replaces with underscore to keep filenames safe for HTTP headers.
   */
  REGEX_NON_ASCII: /[^\x20-\x7E]/g,
  /**
   * Matches single-quote characters for RFC 5987 percent-encoding in filenames.
   */
  REGEX_SINGLE_QUOTE: /'/g,
  /** Replacement string for RFC 5987 single-quote encoding */
  PERCENT_ENCODED_SINGLE_QUOTE: '%27',
};
