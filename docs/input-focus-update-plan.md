# Kế hoạch sửa focus cho các field WorkspaceHub

Ngày rà soát và triển khai: 27/10/2026. Trạng thái: **đã cập nhật source và kiểm tra tự động; còn kiểm chứng trực quan trên browser**.

## Phạm vi và bằng chứng

- Quét toàn bộ TSX trong `frontend/web/app`, `components`, `features`, gồm cả AI notebook và các component ít xuất hiện trong luồng chính. Không quét output `.next` hoặc dependency như source ứng dụng.
- Đọc primitive, wrapper theo feature, nơi gọi và CSS/token liên quan. Kiểm tra thêm native input, file picker ẩn và các trường hợp `unstyled`, `border-0`, `ring-0`, `focus`, `focus-visible`, `focus-within`.
- Ảnh người dùng cung cấp xác nhận lỗi hiển thị ở Confirm Password. Các phát hiện còn lại dưới đây dựa trên source; **chưa thao tác và chụp từng trạng thái trên browser**. Danh sách sử dụng không đồng nghĩa mọi field đều bị lỗi.
- Giữ layout, chiều cao, padding, bo góc riêng của auth, typography, API, validation và dữ liệu hiện có. Tài liệu này không đề xuất redesign các field.
- `app/globals.css` là nguồn token hiện hành. `DESIGN.md` ở root quy định focus hiển thị và giữ hình học auth. `frontend/web/DESIGN.md` có phạm vi notebook, không dùng để thay đổi toàn bộ hệ thống.

## Quy ước người dùng đã chốt

Người dùng đã xác nhận cả ba lựa chọn:

1. Viền ngoài kèm ring mảnh bao quanh toàn bộ field, theo bo góc hiện tại. Triển khai ring 2px bằng token `--ring`, áp dụng cả pointer và keyboard focus.
2. Error + focus giữ viền đỏ theo `--destructive-outline`; ring focus vẫn độc lập theo `--ring`.
3. Bao phủ text/password/search, textarea, date/time picker, select/combobox và khung nhập chat trên toàn frontend. Giữ kích thước và bo góc hiện tại.

Nút eye/clear/copy/format giữ indicator riêng khi được focus. Field ghép chỉ có một phần tử sở hữu border/ring; input con không tự vẽ thêm khung. Không thêm tab stop cho wrapper.

## Phát hiện ban đầu đã đối chiếu source

Các vị trí và dòng ở bảng này là snapshot trước sửa. Hướng xử lý đã được triển khai; kết quả browser vẫn cần xác nhận riêng.

| Mức | Vị trí | Bằng chứng và tác động | Hướng xử lý |
| --- | --- | --- | --- |
| P2 | `components/common/input-field.tsx:27`, `components/ui/input.tsx:11` | Wrapper có border/bo góc và `focus-within:border-primary`; `Input unstyled` vẫn thêm `focus-visible:ring-2`. Input con không có bo góc của wrapper nên ring ôm riêng vùng chữ, khớp ảnh. | Chỉ wrapper sở hữu border/ring của field; input con dùng cơ chế focus thuộc wrapper. |
| P2 | `features/meeting/components/room/side-panel/meeting-room-share-link.tsx:68` | Wrapper có `focus-within:ring-1`, input readonly con là `Input unstyled` vẫn có ring riêng. | Chuyển focus field ra khung chứa icon Link và input. Giữ chọn/copy link. |
| P2 | `features/chat/components/input/rich-text-textarea.tsx:74,92` | Khung ngoài có `focus-within:ring-4`, textarea `unstyled` bên trong chưa tắt ring. Khung còn `overflow-hidden`, có thể cắt ring con. Áp dụng ở create/edit note. | Một indicator ở khung ngoài; nút định dạng vẫn có focus riêng. |
| P1 | `features/meeting/components/room/message/meeting-message-input.tsx:291,346` | Textarea con `border-0` và `focus-visible:ring-0`; khung border bên ngoài chưa có `focus-within` thay thế. Có nguy cơ không nhận biết focus khi nhập bằng bàn phím. | Bổ sung focus trên khung composer trước/đồng thời với việc loại ring con. Xác nhận browser vì đây là kiểm tra source. |
| P2 | `features/meeting/components/common/meeting-device-select.tsx:41,70` | Khung ngoài có ring; trigger bên trong dùng `focus:ring-0`, trong khi primitive dùng `focus-visible:ring-2`. Hai pseudo-state khác nhau, không phải override chắc chắn. | Dùng contract focus thuộc wrapper rõ ràng; kiểm tra cả trigger focus và open/close popup. |
| P2 | `features/meeting/components/room/side-panel/meeting-participants-panel.tsx:65` | Override `focus-within:border-border` và `focus-within:ring-border/10` làm dấu hiệu focus rất nhẹ. | Bỏ override màu focus cục bộ, dùng token focus đã thống nhất; đo lại ở light/dark. |
| P2 | Shared primitives và feature wrappers | Ring 1/2/4px; màu `primary`, `info-outline`, `warning-outline`, `primary-soft`; trộn `focus`, `focus-visible`, `focus-within`. | Thống nhất trạng thái, độ dày và token trong phạm vi được chốt; không thay padding/geometry. |

P1 là ưu tiên accessibility; P2 là lỗi hiển thị/thiếu nhất quán. Không kết luận đã vi phạm WCAG hoặc đã đo contrast khi chưa có kiểm tra browser.

## Các nhóm cần phân biệt khi sửa

### A. Border thuộc wrapper

- `InputField`: 10 JSX nơi gọi trong register, login, forgot password và revoke session. Sửa ở wrapper sẽ tác động đồng thời các field này.
- Meeting invite link; `RichTextTextarea` create/edit note.
- `MeetingInput` có icon và meeting join-link đã chủ động tắt ring con: dùng làm đối chiếu, không mặc định đánh dấu bị double ring.
- Channel/DM/thread composer đã có `focus-within` ngoài và `focus-visible:ring-0` trong: giữ hành vi, chỉ chuyển sang contract chung khi cần.
- Meeting message composer cần bổ sung indicator ngoài.
- Meeting device select là wrapper bao quanh trigger của Radix Select, cần xử lý focus và open state riêng.

### B. Border thuộc chính input/trigger, icon đặt absolute

- `SearchInput`, `PasswordInput` ở Settings, `ComboboxInput` trong share form, các search ở Chat/Project/Documents/Calendar.
- Đây không tự động là lỗi ring bị nằm bên trong. Border/ring của input đã bao gồm phần padding chứa icon.
- Các `Input unstyled` trong chat đa số tự khai báo border và bo góc. **Không tắt ring cho mọi `unstyled`**: sẽ làm mất focus ở các ô này.
- Với clear/eye button, cần giữ indicator riêng khi Tab đến nút; không xóa focus button bằng selector blanket.

### C. Trigger của picker/select

- `CustomDatePicker`, `CustomTimePicker`, `CustomDateTimePicker`/`CustomDateField`, `CustomSelect`, `SelectTrigger`, date range, calendar select và device select.
- Đa số trigger là một button có icon và border, không có input con hiển thị. Áp dụng cùng ngôn ngữ focus nhưng không chuyển mọi trigger sang wrapper mới.
- Focus của trigger và trạng thái popup đang mở khác nhau. Khi focus chuyển vào portal, không dùng duy nhất `focus-within` trên wrapper để biểu diễn popup mở.
- Giữ required/min/max, giá trị rỗng, disabled, thao tác Clear/Done/Cancel, Escape và trả focus về trigger.

### D. Kiểm tra hồi quy và ngoại lệ

- Input/textarea thường, AI notebook, HEX color field, số lần lặp, OTP và trường underline cần kiểm tra nếu thay primitive dùng chung.
- OTP cần focus từng ô, không một ring bao cả nhóm. Trường underline giữ hình học underline.
- Native file input ẩn, required-validation input ẩn của date picker, checkbox/radio/range và DOM của thư viện không phải target để đổi viền đồng loạt.
- Select/combobox giữ hành vi Radix/Base UI; không thay bằng markup tự dựng để xử lý style.

## Kế hoạch triển khai theo thứ tự

- [x] **1. Chốt quy ước focus.** Dùng token hiện có `--ring`, `--input`, `--destructive-outline`; pointer và keyboard focus dùng cùng viền/ring.
- [x] **2. Chuẩn hóa tại shared UI.** `components/ui/field-focus.ts` định nghĩa `focusMode: "self" | "container"` và tên class dùng chung. CSS trong `app/globals.css` xử lý focus, invalid, group focus, popup open và forced colors. `unstyled` không tự động tắt focus. `Input`, `Textarea`, `ComboboxInput`, `NativeSelect`, `SelectTrigger` giữ mặc định self; picker trigger dùng cùng policy.
- [x] **3. Sửa các lỗi gốc.** `InputField`, invite link, rich-text notes, meeting message composer và device select chuyển indicator về border owner. Invalid state được đưa ra wrapper; giữ ARIA/ref/validation. Device select giữ indicator ngoài khi focus chuyển vào portal. CSS focus không đổi width/height/padding/margin/border-width; layout thực tế còn cần xác nhận browser.
- [x] **4. Rà từng feature theo inventory.** Đã bỏ override border/ring/outline focus xung đột ở Auth/Settings, Meetings, Chat, Project, Calendar, Documents và control common. Pomodoro/AI nhận policy qua shared primitives. Search/password dùng group focus để giữ ring trên input khi nút phụ được focus; button vẫn giữ indicator riêng.
- [ ] **5. Kiểm chứng UI có mục tiêu.** Test trạng thái và luồng ở phần dưới, gồm field thật trong modal/drawer/popup. Chụp gộp một vòng desktop/mobile ở light/dark; sửa các lỗi phát hiện trong một đợt và xác nhận lại một vòng.
- [x] **6. Chạy kiểm tra và cập nhật tài liệu.** Typecheck, regression tests và CSS compilation đã pass. Lint được đối chiếu với baseline; không phát sinh diagnostic mới. Detector đã chạy một lần, kết quả rỗng. Giới hạn browser được ghi bên dưới. Không tạo script kiểm tra tạm; `scripts/field-focus.test.mjs` là regression suite cố định, chạy qua `npm run test:field-focus`.

Không cần thay Next.js API để sửa lỗi này. Nếu trong triển khai phát sinh thay đổi framework, đọc guide local `node_modules/next/dist/docs` trước theo `frontend/web/AGENTS.md`.

## Ma trận kiểm chứng và điều kiện hoàn thành

| Trạng thái/luồng | Kỳ vọng |
| --- | --- |
| Default / hover | Border, icon và nội dung giữ layout hiện tại. |
| Click và nhập | Dấu hiệu focus ôm đúng toàn bộ control, không có khung vuông riêng ở vùng chữ. |
| Tab / Shift+Tab | Field và từng eye/clear/copy/format button có focus nhận biết rõ. Không thêm tab stop cho wrapper. |
| Error / error + focus | Màu và indicator theo lựa chọn đã chốt; thông báo lỗi và ARIA còn liên kết đúng. |
| Disabled / pending | Không có focus hay ring ngoài sai khi tương tác; nút phụ không thay đổi field bị khóa. |
| Readonly | Có thể focus/chọn/copy theo hành vi hiện tại, indicator ở đúng border owner. |
| Password toggle / clear search | Không mất value/caret hoặc xảy ra submit ngoài ý muốn; giữ focus thao tác hợp lý. |
| Picker/select/combobox | Mở bằng bàn phím, chọn, Escape, đóng và trả focus; kiểm tra portal trong modal/drawer. |
| Chat / note editor | Textarea nhập nhiều dòng, Enter/Shift+Enter, mention, nút format/emoji/attach/send giữ hành vi và focus. |
| Theme / viewport | Light + dark; desktop khoảng 1440px và mobile khoảng 390px; không cắt ring ở overflow/container, không đè icon, text hay control bên cạnh. |
| Phóng to / độ dài | 200% zoom, text/placeholder dài, value rỗng và có giá trị; ring không thay đổi kích thước field. |
| Tương phản | Kiểm tra focus/border owner theo nền thực tế; ưu tiên mức tương phản 3:1 cho indicator. |

Smoke test theo feature: register/login/forgot password/revoke session; profile/change password; meeting join link/prejoin device/participants/admission/room message; DM/channel/thread + note/poll/search; Project filters/forms/drawer; Calendar quick create/full modal/location/attendees; Documents search/share; Pomodoro settings/filters; AI source/chat/studio fields.

## Giới hạn của bản audit

Source đã được cập nhật, nhưng chưa xác nhận toàn bộ UI trên browser. Computer-use trả về Chrome đang mở, sau đó dừng khi không xác định chắc URL hiện tại để áp dụng policy. Không có screenshot xác nhận sau sửa. Vì vậy các thao tác Tab/Shift+Tab, password toggle, clear, popup selection/Escape/focus restoration, chat send/mention, light/dark, desktop/mobile, zoom, overflow và computed contrast còn chưa được kiểm chứng trực quan.

Bản kiểm kê dưới đây là snapshot trước sửa, ghi JSX usage trong source, bao gồm wrapper dùng primitive và consumer dùng wrapper: không phải số field trên một màn hình hoặc số instance runtime. Dòng source có thể dịch sau khi thêm import/props. Các nhánh conditional và control sinh từ `.map()` cần được đối chiếu ở bước browser QA.

## Kết quả kiểm tra sau triển khai

- `npm run test:field-focus`: **13/13 pass**. Render component thật qua React SSR để kiểm tra standalone/unstyled/delegated focus, DOM attributes, invalid/disabled, auth password, search/password auxiliary buttons, select/combobox, device select, required date và note editor.
- Suite còn biên dịch CSS bằng Tailwind đang cài trong project, kiểm tra ring 2px, ưu tiên border lỗi, không đổi geometry khi focus, fallback forced colors và quét AST để ngăn feature thêm lại override focus xung đột. Đây không phải kiểm tra pixel hoặc tương tác browser.
- `npm run typecheck`: **pass** sau khi cập nhật UI cuối cùng.
- ESLint trên **75 file TS/TSX/MJS** liên quan: **81 errors, 27 warnings**, giống baseline `HEAD`; **không có diagnostic mới**. Hai warning trong thread composer chỉ thay số dòng trong message do thêm import; đã đối chiếu sau khi chuẩn hóa số dòng. Các lỗi có sẵn gồm `any`, hook dependencies và set-state-in-effect; không sửa ngoài phạm vi.
- Lint riêng module focus và regression suite mới: **pass**.
- `git diff --check`: **pass**.
- Impeccable detector trên các UI target thay đổi: **0 findings**.
- Không chạy production build hoặc kiểm thử tích hợp backend; thay đổi chỉ ở UI focus và test/tooling liên quan.

## Kiểm kê source tự động

Scanned **517 TSX files**; found **220 tracked JSX usage sites** in **122 files**, plus **18 native markup sites** (primitive definitions and exceptions).

### Control counts

| Control | JSX sites |
| --- | ---: |
| AttendeePicker | 1 |
| CalendarSelect | 3 |
| ComboboxInput | 2 |
| CustomColorPicker | 3 |
| CustomDateField | 4 |
| CustomDatePicker | 17 |
| CustomDateRange | 1 |
| CustomDateTimePicker | 1 |
| CustomSelect | 33 |
| CustomTimePicker | 2 |
| DocumentsSearchInput | 1 |
| DocumentsSelect | 1 |
| EventCalendarSelect | 1 |
| Input | 68 |
| InputField | 10 |
| LocationPickerInput | 1 |
| MeetingDeviceSelect | 2 |
| MeetingInput | 10 |
| MeetingSelect | 3 |
| MeetingTextarea | 2 |
| OtpInput | 1 |
| PasswordInput | 5 |
| PomodoroTaskPicker | 2 |
| ProjectSearchInput | 2 |
| ProjectSelect | 7 |
| RichTextTextarea | 2 |
| SearchInput | 4 |
| SelectTrigger | 5 |
| SettingInput | 4 |
| SettingSelect | 2 |
| SettingTextarea | 1 |
| Textarea | 19 |

### File inventory

Paths are relative to `frontend/web`. `unstyled` describes composition, not a confirmed defect. Verify each relevant file during implementation; consumers receiving a shared fix may require no direct edit.

| File | Controls and source lines |
| --- | --- |
| [components/common/input-field.tsx](../frontend/web/components/common/input-field.tsx) | Input (unstyled): 39 |
| [components/common/notification-dropdown.tsx](../frontend/web/components/common/notification-dropdown.tsx) | CustomDateRange: 643 |
| [components/common/otp-input.tsx](../frontend/web/components/common/otp-input.tsx) | Input: 104 |
| [components/ui/calendar.tsx](../frontend/web/components/ui/calendar.tsx) | CustomSelect: 59 |
| [components/ui/custom/custom-color-picker.tsx](../frontend/web/components/ui/custom/custom-color-picker.tsx) | Input: 38 |
| [components/ui/custom/custom-date-range.tsx](../frontend/web/components/ui/custom/custom-date-range.tsx) | CustomSelect: 52; CustomDatePicker: 65; CustomDatePicker: 77 |
| [components/ui/custom/custom-date-time-picker.tsx](../frontend/web/components/ui/custom/custom-date-time-picker.tsx) | CustomDatePicker: 27; CustomDateTimePicker: 27; CustomDatePicker: 41; CustomTimePicker: 43 |
| [components/ui/custom/custom-select.tsx](../frontend/web/components/ui/custom/custom-select.tsx) | SelectTrigger: 70 |
| [components/ui/custom/custom-time-picker.tsx](../frontend/web/components/ui/custom/custom-time-picker.tsx) | CustomSelect: 41; CustomSelect: 46 |
| [components/ui/search-input.tsx](../frontend/web/components/ui/search-input.tsx) | Input: 18 |
| [features/ai/components/notebook-list.tsx](../frontend/web/features/ai/components/notebook-list.tsx) | Input: 53 |
| [features/ai/components/notebook-workspace.tsx](../frontend/web/features/ai/components/notebook-workspace.tsx) | Input: 133; Textarea: 321 |
| [features/ai/components/source-panel.tsx](../frontend/web/features/ai/components/source-panel.tsx) | Input: 301 |
| [features/ai/components/studio-panel.tsx](../frontend/web/features/ai/components/studio-panel.tsx) | Input: 132; Textarea: 139; Input: 212; Textarea: 218 |
| [features/auth/components/forgot-password-form.tsx](../frontend/web/features/auth/components/forgot-password-form.tsx) | InputField: 177; OtpInput: 219; InputField: 266; InputField: 293 |
| [features/auth/components/login-form.tsx](../frontend/web/features/auth/components/login-form.tsx) | InputField: 111; InputField: 141 |
| [features/auth/components/register-form.tsx](../frontend/web/features/auth/components/register-form.tsx) | InputField: 113; CustomDatePicker: 130; InputField: 150; InputField: 167; InputField: 192 |
| [features/calendar/components/drawer/calendar-tasks-drawer.tsx](../frontend/web/features/calendar/components/drawer/calendar-tasks-drawer.tsx) | CustomSelect: 153; CustomSelect: 186; CustomSelect: 262; CustomSelect: 415 |
| [features/calendar/components/modal/attachment-editor.tsx](../frontend/web/features/calendar/components/modal/attachment-editor.tsx) | Input: 16 |
| [features/calendar/components/modal/calendar-document-picker-dialog.tsx](../frontend/web/features/calendar/components/modal/calendar-document-picker-dialog.tsx) | Input: 89 |
| [features/calendar/components/modal/calendar-modal.tsx](../frontend/web/features/calendar/components/modal/calendar-modal.tsx) | Input: 167 |
| [features/calendar/components/modal/calendar-select.tsx](../frontend/web/features/calendar/components/modal/calendar-select.tsx) | CustomSelect: 35 |
| [features/calendar/components/modal/calendar-task-deadline-fields.tsx](../frontend/web/features/calendar/components/modal/calendar-task-deadline-fields.tsx) | CustomDatePicker: 24; CustomTimePicker: 26 |
| [features/calendar/components/modal/calendar-task-title-field.tsx](../frontend/web/features/calendar/components/modal/calendar-task-title-field.tsx) | Input: 21 |
| [features/calendar/components/modal/calendar-time-fields.tsx](../frontend/web/features/calendar/components/modal/calendar-time-fields.tsx) | CustomDatePicker: 84; CustomDatePicker: 97; CalendarSelect: 111; CalendarSelect: 123 |
| [features/calendar/components/modal/custom-recurrence-modal.tsx](../frontend/web/features/calendar/components/modal/custom-recurrence-modal.tsx) | Input: 156; CustomSelect: 172; CustomDatePicker: 246; Input: 265 |
| [features/calendar/components/modal/event-calendar-select.tsx](../frontend/web/features/calendar/components/modal/event-calendar-select.tsx) | SelectTrigger: 62 |
| [features/calendar/components/modal/location-picker-input.tsx](../frontend/web/features/calendar/components/modal/location-picker-input.tsx) | ComboboxInput: 92 |
| [features/calendar/components/modal/quick-create-event-fields.tsx](../frontend/web/features/calendar/components/modal/quick-create-event-fields.tsx) | AttendeePicker: 37; LocationPickerInput: 54 |
| [features/calendar/components/modal/quick-create-modal.tsx](../frontend/web/features/calendar/components/modal/quick-create-modal.tsx) | Input: 197; Textarea: 285; EventCalendarSelect: 323 |
| [features/calendar/components/modal/quick-create-time-section.tsx](../frontend/web/features/calendar/components/modal/quick-create-time-section.tsx) | CalendarSelect: 23 |
| [features/calendar/components/modal/reminder-editor.tsx](../frontend/web/features/calendar/components/modal/reminder-editor.tsx) | CustomSelect: 59; CustomSelect: 72; Input: 110; CustomSelect: 129 |
| [features/calendar/components/sidebar/calendar-color-popover.tsx](../frontend/web/features/calendar/components/sidebar/calendar-color-popover.tsx) | CustomColorPicker: 20 |
| [features/calendar/components/sidebar/calendar-style-fields.tsx](../frontend/web/features/calendar/components/sidebar/calendar-style-fields.tsx) | CustomColorPicker: 76 |
| [features/calendar/components/toolbar/calendar-toolbar.tsx](../frontend/web/features/calendar/components/toolbar/calendar-toolbar.tsx) | CustomSelect: 82 |
| [features/calendar/components/workspace/attendee-picker.tsx](../frontend/web/features/calendar/components/workspace/attendee-picker.tsx) | Input: 67 |
| [features/chat/components/input/channel-chat-input.tsx](../frontend/web/features/chat/components/input/channel-chat-input.tsx) | Textarea (unstyled): 1039 |
| [features/chat/components/input/direct-message-input.tsx](../frontend/web/features/chat/components/input/direct-message-input.tsx) | Textarea (unstyled): 678 |
| [features/chat/components/input/rich-text-textarea.tsx](../frontend/web/features/chat/components/input/rich-text-textarea.tsx) | Textarea (unstyled): 92 |
| [features/chat/components/input/thread-chat-input.tsx](../frontend/web/features/chat/components/input/thread-chat-input.tsx) | Textarea (unstyled): 866 |
| [features/chat/components/message/poll-message.tsx](../frontend/web/features/chat/components/message/poll-message.tsx) | Input (unstyled): 267 |
| [features/chat/components/modals/channel/browse-channels-modal.tsx](../frontend/web/features/chat/components/modals/channel/browse-channels-modal.tsx) | Input (unstyled): 172 |
| [features/chat/components/modals/channel/channel-member-picker.tsx](../frontend/web/features/chat/components/modals/channel/channel-member-picker.tsx) | Input: 70 |
| [features/chat/components/modals/channel/channel-members-modal.tsx](../frontend/web/features/chat/components/modals/channel/channel-members-modal.tsx) | Input (unstyled): 92 |
| [features/chat/components/modals/channel/channel-settings-modal.tsx](../frontend/web/features/chat/components/modals/channel/channel-settings-modal.tsx) | Input (unstyled): 152 |
| [features/chat/components/modals/channel/create-channel-modal.tsx](../frontend/web/features/chat/components/modals/channel/create-channel-modal.tsx) | Input: 91 |
| [features/chat/components/modals/channel/private-channel-members-modal.tsx](../frontend/web/features/chat/components/modals/channel/private-channel-members-modal.tsx) | Input: 89 |
| [features/chat/components/modals/message/create-note-modal.tsx](../frontend/web/features/chat/components/modals/message/create-note-modal.tsx) | Input (unstyled): 67; RichTextTextarea: 81 |
| [features/chat/components/modals/message/create-poll-modal.tsx](../frontend/web/features/chat/components/modals/message/create-poll-modal.tsx) | Input (unstyled): 99; Input (unstyled): 115 |
| [features/chat/components/modals/message/edit-note-modal.tsx](../frontend/web/features/chat/components/modals/message/edit-note-modal.tsx) | Input (unstyled): 75; RichTextTextarea: 89 |
| [features/chat/components/modals/message/edit-poll-modal.tsx](../frontend/web/features/chat/components/modals/message/edit-poll-modal.tsx) | Input (unstyled): 98 |
| [features/chat/components/modals/shared/search-user-modal.tsx](../frontend/web/features/chat/components/modals/shared/search-user-modal.tsx) | Input (unstyled): 184 |
| [features/chat/components/modals/space/invite-space-members-modal.tsx](../frontend/web/features/chat/components/modals/space/invite-space-members-modal.tsx) | Input (unstyled): 184 |
| [features/chat/components/modals/space/manage-members-modal.tsx](../frontend/web/features/chat/components/modals/space/manage-members-modal.tsx) | Input (unstyled): 313 |
| [features/chat/components/modals/space/space-settings/members-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/members-tab.tsx) | Input (unstyled): 53 |
| [features/chat/components/modals/space/space-settings/overview-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/overview-tab.tsx) | Input (unstyled): 56 |
| [features/chat/components/right-panel/files/media-detail-view.tsx](../frontend/web/features/chat/components/right-panel/files/media-detail-view.tsx) | Input (unstyled): 274; CustomSelect: 287 |
| [features/chat/components/right-panel/notes/note-detail-view.tsx](../frontend/web/features/chat/components/right-panel/notes/note-detail-view.tsx) | Input (unstyled): 57 |
| [features/chat/components/right-panel/pinned-messages/pinned-messages-detail-view.tsx](../frontend/web/features/chat/components/right-panel/pinned-messages/pinned-messages-detail-view.tsx) | Input (unstyled): 206; CustomSelect: 221 |
| [features/chat/components/right-panel/polls/poll-detail-view.tsx](../frontend/web/features/chat/components/right-panel/polls/poll-detail-view.tsx) | Input (unstyled): 62 |
| [features/chat/components/right-panel/search/search-messages-section.tsx](../frontend/web/features/chat/components/right-panel/search/search-messages-section.tsx) | Input (unstyled): 135; Input (unstyled): 158 |
| [features/chat/components/right-panel/thread/threads-list-view.tsx](../frontend/web/features/chat/components/right-panel/thread/threads-list-view.tsx) | CustomSelect: 148 |
| [features/chat/components/sidebar/chat-sidebar.tsx](../frontend/web/features/chat/components/sidebar/chat-sidebar.tsx) | Input (unstyled): 850 |
| [features/chat/components/sidebar/followed-threads-modal.tsx](../frontend/web/features/chat/components/sidebar/followed-threads-modal.tsx) | Input (unstyled): 174 |
| [features/chat/components/ui/chat-confirm-dialog.tsx](../frontend/web/features/chat/components/ui/chat-confirm-dialog.tsx) | Input (unstyled): 120 |
| [features/chat/components/ui/chat-form-controls.tsx](../frontend/web/features/chat/components/ui/chat-form-controls.tsx) | SearchInput: 23; CustomSelect: 56 |
| [features/chat/components/ui/chat-input-modal.tsx](../frontend/web/features/chat/components/ui/chat-input-modal.tsx) | Input: 96 |
| [features/documents/components/explorer/explorer-toolbar.tsx](../frontend/web/features/documents/components/explorer/explorer-toolbar.tsx) | DocumentsSearchInput: 72; DocumentsSelect: 81 |
| [features/documents/components/sharing/share-form.tsx](../frontend/web/features/documents/components/sharing/share-form.tsx) | ComboboxInput (unstyled): 177; CustomSelect: 196 |
| [features/documents/components/sharing/share-link.tsx](../frontend/web/features/documents/components/sharing/share-link.tsx) | CustomSelect: 114; Input: 140 |
| [features/documents/components/sharing/share-list.tsx](../frontend/web/features/documents/components/sharing/share-list.tsx) | CustomSelect: 206 |
| [features/documents/components/sharing/share-to-chat-modal.tsx](../frontend/web/features/documents/components/sharing/share-to-chat-modal.tsx) | CustomSelect: 163; CustomSelect: 176; CustomSelect: 195; Textarea: 209 |
| [features/documents/components/ui/documents-form-controls.tsx](../frontend/web/features/documents/components/ui/documents-form-controls.tsx) | SearchInput: 25; CustomSelect: 60 |
| [features/documents/components/ui/documents-input-modal.tsx](../frontend/web/features/documents/components/ui/documents-input-modal.tsx) | Input: 96 |
| [features/meeting/components/common/meeting-device-select.tsx](../frontend/web/features/meeting/components/common/meeting-device-select.tsx) | MeetingSelect: 57 |
| [features/meeting/components/common/meeting-join-link-modal.tsx](../frontend/web/features/meeting/components/common/meeting-join-link-modal.tsx) | MeetingInput: 118 |
| [features/meeting/components/recordings/meeting-recording-share-dialog.tsx](../frontend/web/features/meeting/components/recordings/meeting-recording-share-dialog.tsx) | MeetingInput: 96 |
| [features/meeting/components/recordings/meeting-recordings-view.tsx](../frontend/web/features/meeting/components/recordings/meeting-recordings-view.tsx) | MeetingInput: 87; CustomSelect: 94; MeetingInput: 288 |
| [features/meeting/components/room/meeting-password-gate.tsx](../frontend/web/features/meeting/components/room/meeting-password-gate.tsx) | MeetingInput: 67 |
| [features/meeting/components/room/meeting-prejoin.tsx](../frontend/web/features/meeting/components/room/meeting-prejoin.tsx) | MeetingDeviceSelect: 186; MeetingDeviceSelect: 194 |
| [features/meeting/components/room/message/meeting-message-input.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-input.tsx) | MeetingTextarea: 346 |
| [features/meeting/components/room/side-panel/meeting-participants-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-participants-panel.tsx) | MeetingInput: 60 |
| [features/meeting/components/room/side-panel/meeting-room-admission-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-admission-panel.tsx) | MeetingInput: 68 |
| [features/meeting/components/room/side-panel/meeting-room-share-link.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-share-link.tsx) | Input (unstyled): 70 |
| [features/meeting/components/schedule/schedule-meeting-modal.tsx](../frontend/web/features/meeting/components/schedule/schedule-meeting-modal.tsx) | MeetingInput: 445; CustomDatePicker: 457; MeetingSelect: 470; MeetingSelect: 482; MeetingInput: 510; MeetingTextarea: 575; MeetingInput: 613 |
| [features/meeting/components/ui/meeting-form-controls.tsx](../frontend/web/features/meeting/components/ui/meeting-form-controls.tsx) | Input: 65; Input: 85; Textarea: 107; CustomSelect: 138 |
| [features/pomodoro/components/pomodoro-active-task.tsx](../frontend/web/features/pomodoro/components/pomodoro-active-task.tsx) | Textarea: 30; PomodoroTaskPicker: 69 |
| [features/pomodoro/components/pomodoro-calendar-task-form.tsx](../frontend/web/features/pomodoro/components/pomodoro-calendar-task-form.tsx) | Input: 96; Textarea: 115 |
| [features/pomodoro/components/pomodoro-focus-dialog.tsx](../frontend/web/features/pomodoro/components/pomodoro-focus-dialog.tsx) | PomodoroTaskPicker: 76 |
| [features/pomodoro/components/pomodoro-project-task-panel.tsx](../frontend/web/features/pomodoro/components/pomodoro-project-task-panel.tsx) | CustomSelect: 43 |
| [features/pomodoro/components/pomodoro-report-filters.tsx](../frontend/web/features/pomodoro/components/pomodoro-report-filters.tsx) | CustomDatePicker: 22; CustomDatePicker: 29; CustomSelect: 52; CustomSelect: 62; CustomSelect: 69 |
| [features/pomodoro/components/pomodoro-settings-form.tsx](../frontend/web/features/pomodoro/components/pomodoro-settings-form.tsx) | SettingInput: 65; SettingSelect: 81 |
| [features/pomodoro/components/pomodoro-task-editor.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-editor.tsx) | Input: 43; Textarea: 44 |
| [features/pomodoro/components/pomodoro-task-filters.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-filters.tsx) | Input: 29 |
| [features/project/components/dialogs/create-project-dialog.tsx](../frontend/web/features/project/components/dialogs/create-project-dialog.tsx) | Input: 118; Textarea: 137; CustomDatePicker: 157; CustomDatePicker: 183 |
| [features/project/components/dialogs/invite-member-dialog.tsx](../frontend/web/features/project/components/dialogs/invite-member-dialog.tsx) | Input: 131 |
| [features/project/components/dialogs/project-settings-dialog.tsx](../frontend/web/features/project/components/dialogs/project-settings-dialog.tsx) | CustomDatePicker: 133; CustomDatePicker: 145; Input: 164; Textarea: 175; ProjectSelect: 254 |
| [features/project/components/dialogs/select-task-channel-dialog.tsx](../frontend/web/features/project/components/dialogs/select-task-channel-dialog.tsx) | SelectTrigger: 158 |
| [features/project/components/dialogs/task-form-dialog.tsx](../frontend/web/features/project/components/dialogs/task-form-dialog.tsx) | Input: 152; Textarea: 170 |
| [features/project/components/forms/project-label-manager.tsx](../frontend/web/features/project/components/forms/project-label-manager.tsx) | CustomColorPicker: 33; Input: 150; Input: 254 |
| [features/project/components/forms/task-assignee-field.tsx](../frontend/web/features/project/components/forms/task-assignee-field.tsx) | SearchInput: 92 |
| [features/project/components/forms/task-date-range-fields.tsx](../frontend/web/features/project/components/forms/task-date-range-fields.tsx) | CustomDateField: 58; CustomDateField: 76 |
| [features/project/components/forms/task-details-fields.tsx](../frontend/web/features/project/components/forms/task-details-fields.tsx) | ProjectSelect: 60; ProjectSelect: 74 |
| [features/project/components/layout/project-detail-toolbar.tsx](../frontend/web/features/project/components/layout/project-detail-toolbar.tsx) | ProjectSearchInput: 236 |
| [features/project/components/list/task-inline-creator.tsx](../frontend/web/features/project/components/list/task-inline-creator.tsx) | Input: 62 |
| [features/project/components/task-detail/task-checklist-section.tsx](../frontend/web/features/project/components/task-detail/task-checklist-section.tsx) | Input: 111 |
| [features/project/components/task-detail/task-comments-section.tsx](../frontend/web/features/project/components/task-detail/task-comments-section.tsx) | Textarea: 197; Input: 252 |
| [features/project/components/task-detail/task-detail-drawer.tsx](../frontend/web/features/project/components/task-detail/task-detail-drawer.tsx) | Input: 205; Textarea: 307 |
| [features/project/components/task-detail/task-documents-section.tsx](../frontend/web/features/project/components/task-detail/task-documents-section.tsx) | Input: 378 |
| [features/project/components/task-detail/task-properties-panel.tsx](../frontend/web/features/project/components/task-detail/task-properties-panel.tsx) | ProjectSelect: 282; CustomDateField: 315; CustomDateField: 332 |
| [features/project/components/ui/project-form-controls.tsx](../frontend/web/features/project/components/ui/project-form-controls.tsx) | SearchInput: 26; CustomSelect: 58 |
| [features/project/components/ui/task-card.tsx](../frontend/web/features/project/components/ui/task-card.tsx) | SelectTrigger: 256 |
| [features/project/components/ui/task-quick-filters.tsx](../frontend/web/features/project/components/ui/task-quick-filters.tsx) | ProjectSelect: 58; ProjectSelect: 66; ProjectSelect: 74 |
| [features/project/components/views/calendar-view.tsx](../frontend/web/features/project/components/views/calendar-view.tsx) | SelectTrigger: 274; Input: 293 |
| [features/project/components/views/project-members-view.tsx](../frontend/web/features/project/components/views/project-members-view.tsx) | Input: 306 |
| [features/project/screens/projects-screen.tsx](../frontend/web/features/project/screens/projects-screen.tsx) | ProjectSearchInput: 193 |
| [features/user-setting/components/password-input.tsx](../frontend/web/features/user-setting/components/password-input.tsx) | Input: 37 |
| [features/user-setting/components/password-tab.tsx](../frontend/web/features/user-setting/components/password-tab.tsx) | PasswordInput: 222; PasswordInput: 230; PasswordInput: 238; SettingInput: 299; PasswordInput: 316; PasswordInput: 324 |
| [features/user-setting/components/profile-tab.tsx](../frontend/web/features/user-setting/components/profile-tab.tsx) | SettingInput: 172; SettingInput: 181; CustomDatePicker: 193; SettingTextarea: 206 |
| [features/user-setting/components/revoke-session-modal.tsx](../frontend/web/features/user-setting/components/revoke-session-modal.tsx) | InputField: 83 |
| [features/user-setting/components/settings-tab.tsx](../frontend/web/features/user-setting/components/settings-tab.tsx) | SettingSelect: 78 |
| [features/user-setting/components/ui/setting-form-controls.tsx](../frontend/web/features/user-setting/components/ui/setting-form-controls.tsx) | Input: 33; Textarea: 122; CustomSelect: 166 |

### Native markup classification

| File : line | Native control | Scope |
| --- | --- | --- |
| [components/ui/checkbox.tsx:53](../frontend/web/components/ui/checkbox.tsx) | input, type="checkbox" | Primitive definition; review with shared policy |
| [components/ui/custom/custom-date-picker.tsx:70](../frontend/web/components/ui/custom/custom-date-picker.tsx) | input, type="text" | Hidden validation input; preserve required/min/max and trigger focus |
| [components/ui/input.tsx:7](../frontend/web/components/ui/input.tsx) | input, type={type} | Primitive definition; review with shared policy |
| [components/ui/native-select.tsx:6](../frontend/web/components/ui/native-select.tsx) | select, type=dynamic/default | Primitive definition; review with shared policy |
| [components/ui/radio-group.tsx:20](../frontend/web/components/ui/radio-group.tsx) | input, type="radio" | Primitive definition; review with shared policy |
| [components/ui/textarea.tsx:7](../frontend/web/components/ui/textarea.tsx) | textarea, type=dynamic/default | Primitive definition; review with shared policy |
| [features/ai/components/source-panel.tsx:86](../frontend/web/features/ai/components/source-panel.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
| [features/ai/components/source-panel.tsx:127](../frontend/web/features/ai/components/source-panel.tsx) | input, type="checkbox" | Checkbox; outside text-field border scope |
| [features/calendar/components/modal/calendar-documents-section.tsx:123](../frontend/web/features/calendar/components/modal/calendar-documents-section.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
| [features/chat/components/input/channel-chat-input.tsx:845](../frontend/web/features/chat/components/input/channel-chat-input.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
| [features/chat/components/input/direct-message-input.tsx:625](../frontend/web/features/chat/components/input/direct-message-input.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
| [features/chat/components/input/thread-chat-input.tsx:669](../frontend/web/features/chat/components/input/thread-chat-input.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
| [features/documents/components/explorer/explorer-toolbar.tsx:162](../frontend/web/features/documents/components/explorer/explorer-toolbar.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
| [features/documents/components/versions/version-uploader.tsx:38](../frontend/web/features/documents/components/versions/version-uploader.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
| [features/meeting/components/room/message/meeting-message-input.tsx:292](../frontend/web/features/meeting/components/room/message/meeting-message-input.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
| [features/meeting/components/schedule/schedule-meeting-modal.tsx:658](../frontend/web/features/meeting/components/schedule/schedule-meeting-modal.tsx) | input, type="checkbox" | Checkbox; outside text-field border scope |
| [features/project/components/task-detail/task-documents-section.tsx:156](../frontend/web/features/project/components/task-detail/task-documents-section.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
| [features/user-setting/components/profile-tab.tsx:155](../frontend/web/features/user-setting/components/profile-tab.tsx) | input, type="file" | Hidden file picker; preserve native semantics |
