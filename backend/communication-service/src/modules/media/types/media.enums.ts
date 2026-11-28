export enum MEDIA_SUCCESS_MESSAGES {
  ACCESS_URL_GENERATED = 'Generated attachment access URL successfully',
  PRESIGNED_URLS_GENERATED = 'Generated presigned URLs successfully',
}

export enum MEDIA_ERROR_MESSAGES {
  ATTACHMENT_NOT_FOUND = 'Attachment not found',
  MISSING_REQUIRED_FIELDS = 'Channel id or conversation id is required',
  EMPTY_FILES = 'Files array is required and cannot be empty',
  FILE_TOO_LARGE = 'File {fileName} exceeds the 10 MiB limit.',
}
