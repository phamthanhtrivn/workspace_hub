export enum MEDIA_SUCCESS_MESSAGES {
  PRESIGNED_URLS_GENERATED = 'Generated presigned URLs successfully',
}

export enum MEDIA_ERROR_MESSAGES {
  MISSING_REQUIRED_FIELDS = 'Channel id or conversation id is required',
  EMPTY_FILES = 'Files array is required and cannot be empty',
  FILE_TOO_LARGE = 'File {fileName} exceeds the 100MB limit.',
}
