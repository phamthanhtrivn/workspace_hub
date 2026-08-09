export enum MESSAGE_DIRECTION {
  OLDER = 'older',
  NEWER = 'newer',
  AROUND = 'around',
}

export enum THREAD_FOLLOW_LABEL {
  FOLLOWING = 'Đã theo dõi luồng',
  UN_FOLLOWING = 'Đã bỏ theo dõi luồng',
}

export enum MESSAGE_CONSTANTS {
  DEFAULT_LIMIT = 20,
}

export enum MESSAGE_SUCCESS_MESSAGES {
  HISTORY_RETRIEVED = 'Lấy lịch sử tin nhắn thành công',
  MEDIA_RETRIEVED = 'Lấy dữ liệu media thành công',
  PINNED_RETRIEVED = 'Lấy danh sách tin nhắn ghim thành công',
  SEARCH_COMPLETED = 'Tìm kiếm tin nhắn thành công',
  THREAD_RETRIEVED = 'Lấy tin nhắn trong luồng thành công',
  THREADS_LISTED = 'Lấy danh sách các luồng thành công',
}

export enum MESSAGE_ERROR_MESSAGES {
  NOT_MEMBER_OF_CONVERSATION = 'Bạn không phải là thành viên của cuộc trò chuyện này',
  NOT_MEMBER_OF_CHANNEL = 'Bạn không phải là thành viên của kênh này',
  NOT_MEMBER_OF_SPACE = 'Bạn không phải là thành viên của không gian này',
  MESSAGE_DISABLED = 'Quản trị viên đã tắt tính năng nhắn tin ở kênh này',
  POLL_DISABLED = 'Quản trị viên đã tắt tính năng tạo bình chọn ở kênh này',
  NOTE_DISABLED = 'Quản trị viên đã tắt tính năng tạo ghi chú ở kênh này',
  PARENT_NOT_FOUND = 'Tin nhắn gốc của luồng không tồn tại',
  MESSAGE_NOT_FOUND = 'Không tìm thấy tin nhắn',
  ROOT_THREAD_NOT_FOUND = 'Không tìm thấy tin nhắn gốc của luồng',
  PIN_DISABLED = 'Quản trị viên đã tắt tính năng ghim tin nhắn ở kênh này',
  ALREADY_PINNED = 'Tin nhắn đã được ghim',
  NOT_PINNED = 'Tin nhắn chưa được ghim',
  MAX_PIN_REACHED = 'Chỉ được ghim tối đa 3 tin nhắn',
  NOT_MEMBER_OF_GROUP = 'Bạn không phải là thành viên nhóm này',
  NOT_FOUND_SIMPLE = 'Tin nhắn không tìm thấy',
  MISSING_CHANNEL_ID = 'Thiếu channelId',
  MISSING_MESSAGE_ID = 'Thiếu messageId',
  MISSING_USER_ID = 'Thiếu userId',
}
