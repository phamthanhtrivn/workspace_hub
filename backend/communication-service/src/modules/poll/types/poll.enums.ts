export enum POLL_SUCCESS_MESSAGES {
  RETRIEVED = 'Polls retrieved successfully',
  VOTED = 'Vote submitted successfully',
  OPTION_ADDED = 'Poll option added successfully',
  UPDATED = 'Poll updated successfully',
}

export enum POLL_ERROR_MESSAGES {
  NOT_FOUND = 'Poll not found',
  OPTION_NOT_FOUND = 'Poll option not found',
  ADD_OPTION_PREVENTED = 'Adding options is not allowed',
}
