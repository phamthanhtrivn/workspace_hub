# Rà soát production readiness — Project

Ngày: 05/09/2026. Nhánh: `fix/calendar-recurrence-production`. Commit được rà soát: `2873a8f`.

**Kết luận: Project chưa sẵn sàng cho production.** Có nền tảng phân quyền, transaction và test, nhưng còn lỗi lưu dữ liệu, ngày giờ, trạng thái Sprint và một số chức năng giao diện đang là mock. Không dùng số lượng test vượt qua để suy ra toàn bộ luồng sản phẩm đã hoạt động đúng.

Phạm vi: `backend/project-service`, `frontend/web/features/project`, các route `app/(workspace)/projects` và điểm tích hợp trực tiếp cần đối chiếu cho Project. Không đánh giá độc lập Calendar, Chat, Document hay các service khác. Trong Project có cả dạng GENERAL và SOFTWARE_DEVELOPMENT/Sprint.

Đây là báo cáo review, không phải bản sửa lỗi. Không thay đổi mã ứng dụng, database hay cấu hình triển khai.

P1: cần xử lý trước khi phát hành chức năng liên quan. P2: lỗi chức năng/nhất quán cần sửa và kiểm chứng trước khi chốt chất lượng sản phẩm. “Tái hiện giả lập” là gọi code hiện tại với dependency thay thế, không phải E2E trên hạ tầng thật.

**Kết quả kiểm tra đã chạy**

| Kiểm tra | Kết quả |
| --- | --- |
| Backend: `npm.cmd test -- --silent` | 15 suite, 40 test vượt qua |
| Backend: `npm.cmd run lint` | Vượt qua |
| Backend: `tsc.cmd --noEmit --incremental false` | Vượt qua |
| Backend: Prisma validate | Schema hợp lệ |
| Frontend: `npm.cmd run test:project` | 2 test pagination vượt qua; chưa bao phủ nghiệp vụ UI |
| Frontend: ESLint trên features/project và app/(workspace)/projects | Vượt qua |
| Frontend: `tsc.cmd --noEmit --incremental false` | Vượt qua; cần kiểm tra kiểu toàn web để giải quyết import |
| Tái hiện bổ sung bằng Node/TypeScript | 9 tình huống xác nhận hành vi lỗi ở service/helper/action/cache |

Chưa chạy integration với database thật, browser E2E, tải đồng thời, migration trên dữ liệu hiện hữu, hoặc build/khởi động production container. Docker engine không chạy và chưa có TEST_DATABASE_URL riêng. Bộ integration hiện xóa dữ liệu sau mỗi test, vì vậy không dùng database làm việc thay thế. Lần tsc backend đầu tiên bị EPERM khi ghi cache incremental; lần chạy không incremental đã thành công.

**Các phát hiện, theo mức ưu tiên**

### R01 — P1 — Task đã lưu nhưng request báo lỗi khi Kafka thất bại

Nguồn: [task.service.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/task.service.ts:109) và [task-calendar-event.service.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/task-calendar-event.service.ts:66).

`create`, `update` và `delete` commit transaction trước khi await phát sự kiện Kafka. Nếu Kafka lỗi, method reject dù thay đổi đã được ghi. Người dùng thử tạo lại có thể tạo task trùng; sự kiện xóa lịch thất bại cũng không được job khởi động bù lại vì job chỉ quét task chưa xóa, chưa archive và còn lịch.

Xác minh: Đã gọi trực tiếp TaskService với transaction và publisher giả lập: transaction hoàn tất, sau đó create reject do Kafka. Đây là kiểm tra luồng điều khiển, chưa phải thử nghiệm Kafka/PostgreSQL thật.

Hướng sửa: Ghi sự kiện vào transactional outbox cùng thay đổi task, worker phát lại có retry và idempotency. Outbox notification đang có là nền tảng có thể mở rộng; nó chưa bao phủ producer này.

### R02 — P1 — Tệp Project/Sprint chưa được lưu lên hệ thống

Nguồn: [project-file-panel.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/project-file-panel.tsx:58) và [software-backlog-view.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/software-backlog-view.tsx:92).

Chọn Add file chỉ tạo URL.createObjectURL và đưa metadata vào useState của Backlog. Không có thao tác upload/lưu metadata. Chuyển sang Board rồi quay lại hoặc reload sẽ mất danh sách; thành viên khác không nhận được tệp. File gốc trên máy vẫn còn.

Xác minh: Đối chiếu toàn bộ handler chọn/thêm/xóa tệp và nơi mount/unmount SoftwareBacklogView. Chưa thực hiện browser E2E.

Hướng sửa: Tích hợp lưu trữ tệp và API metadata có kiểm tra quyền, trạng thái upload và xử lý lỗi; hoặc ẩn chức năng này khỏi bản phát hành đến khi hoàn thiện.

### R03 — P1 — Ngày giờ task không nhất quán giữa form, API và hiển thị

Nguồn: [task-form-dialog.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/task-form-dialog.tsx:28), [task.service.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/task.service.ts:391) và [calendar-view.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/calendar-view.tsx:26).

Form cắt chuỗi ISO bằng slice để điền datetime-local và gửi chuỗi thiếu offset. Backend new Date(value) phụ thuộc múi giờ tiến trình. Ví dụ timestamp 2026-09-05T02:00:00Z là 09:00 tại Việt Nam nhưng form điền 02:00. Với server UTC, người dùng nhập 09:00 không offset sẽ được lưu thành 09:00Z. Calendar của Project còn lấy ngày bằng slice nhưng định dạng giờ theo múi giờ trình duyệt, có thể lệch ngày ở ranh giới nửa đêm.

Xác minh: Đã chạy chính helper lấy từ AST của file: 09:00 Việt Nam hiện thành 02:00 trong input.

Hướng sửa: Chốt quy ước timezone cho Project; chuyển ISO sang giờ địa phương khi điền form và chuyển ngược có offset/UTC khi gửi. Xử lý ngày all-day riêng, kiểm tra cả ca qua nửa đêm.

### R04 — P2 — Có thể chuyển task ra khỏi Sprint đang chạy qua API thêm vào Sprint khác

Nguồn: [sprint.service.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/sprint.service.ts:74).

removeTask chặn Sprint nguồn không PLANNED, nhưng addTasks chỉ kiểm tra Sprint đích. Chọn task thuộc Sprint A ACTIVE rồi thêm vào B PLANNED vẫn update sprintId thành B. Kiểm tra và cập nhật cũng đang tách rời, không có transaction bảo vệ trạng thái Sprint nguồn/đích.

Xác minh: Đã gọi SprintService với dữ liệu giả lập: removeTask từ A bị từ chối, addTasks vào B thành công với cùng task.

Hướng sửa: Kiểm tra cả Sprint nguồn và đích theo quy tắc nghiệp vụ, thực hiện kiểm tra/cập nhật trong transaction có kiểm soát cạnh tranh. Đồng bộ ràng buộc kéo thả ở frontend.

### R05 — P2 — Đổi task cha có thể phá cấu trúc cây và quan hệ Sprint

Nguồn: [task.service.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/task.service.ts:178) và [software-backlog-view.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/software-backlog-view.tsx:534).

validateParent chỉ kiểm tra cha mới là task cấp gốc; không kiểm tra task đang chuyển có con. Khi A có con B, đổi A thành con của C được chấp nhận, tạo C → A → B. Backlog chỉ render gốc và một tầng con nên B có thể không xuất hiện. Khi đổi cha, giá trị sprintId trả về từ validateParent còn bị bỏ qua, khác với nhánh create vốn kế thừa Sprint của cha.

Xác minh: Đã gọi TaskService.update với A có childCount=1: đổi cha thành công và dữ liệu update không đồng bộ Sprint mới.

Hướng sửa: Nếu sản phẩm chỉ hỗ trợ hai tầng, chặn chuyển task đang có con thành subtask. Chốt quy tắc đổi cha/đổi Sprint và bảo vệ toàn bộ cây trong một transaction.

### R06 — P2 — Frontend có thể báo cập nhật thành công sau khi API thất bại

Nguồn: [use-project-task-actions.ts](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/hooks/use-project-task-actions.ts:124) và [task-detail-drawer.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/task-detail-drawer.tsx:180).

updateTaskDirect catch lỗi và chỉ toast.error, không throw lại. Drawer await callback rồi chạy toast.success và đóng ô sửa. Khi request thất bại, người dùng có thể thấy cả thông báo lỗi lẫn thành công và tưởng thay đổi đã được lưu.

Xác minh: Đã thực thi hook với mutation giả lập trả lỗi HTTP: callback vẫn resolve. Đã đối chiếu caller trong drawer.

Hướng sửa: Trả kết quả thành công/thất bại rõ ràng hoặc rethrow sau xử lý lỗi; chỉ báo thành công và đóng editor khi đã lưu. Tập trung thông báo ở một tầng.

### R07 — P2 — Mở task từ Sprint làm thiếu assignee, checklist và label

Nguồn: [sprint.service.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/sprint.service.ts:22), [project.mapper.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/project.mapper.ts:100) và [software-backlog-view.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/software-backlog-view.tsx:435).

Query Sprint chỉ include _count của task. Mapper thay quan hệ chưa load bằng mảng rỗng. Frontend đưa trực tiếp task này vào drawer, không fetch getTask để lấy đầy đủ. Vì vậy cùng task mở từ Board có dữ liệu, mở từ Sprint lại có thể hiện chưa được gán hoặc chưa có checklist/label.

Xác minh: Đối chiếu query, mapper, normalizeSprint và đường truyền onTaskClick → selectedTask → TaskDetailDrawer; không có bước bổ sung dữ liệu detail trong luồng này.

Hướng sửa: Dùng projection task nhất quán hoặc chỉ giữ selectedTaskId và lấy task detail chuẩn từ query riêng. Không dùng mảng rỗng để biểu diễn quan hệ chưa tải.

### R08 — P2 — Sửa task không làm mới dữ liệu task nằm trong cache Sprint

Nguồn: [use-tasks.ts](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/hooks/use-tasks.ts:38) và [software-backlog-view.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/software-backlog-view.tsx:416).

Mutation task làm mới query tasks/detail nhưng không làm mới query sprints. Trong Backlog, các dòng của Sprint lấy từ sprint.tasks; biểu đồ cũng ưu tiên danh sách này. Sau khi sửa trạng thái/tên, drawer hoặc Board có thể mới nhưng dòng trong Sprint còn cũ cho đến một lần refetch khác.

Xác minh: Đã gọi callback onSuccess với QueryClient thật: query tasks bị invalidated, query sprints không bị invalidated.

Hướng sửa: Đồng bộ invalidation/update cho các query liên quan, hoặc chuẩn hóa một nguồn dữ liệu task theo id. Bao phủ cả tạo subtask, checklist và label.

### R09 — P2 — Xóa ngày trong form không xóa ngày đang lưu

Nguồn: [task-form-dialog.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/task-form-dialog.tsx:33) và [task-detail-drawer.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/task-detail-drawer.tsx:302).

toApiDateTime trả undefined khi input rỗng. Khi PATCH được serialize, thuộc tính bị bỏ, backend hiểu là giữ giá trị cũ. Drawer cũng gửi undefined khi xóa startDate; riêng dueDate của drawer đã gửi null đúng.

Xác minh: Đã chạy helper thực tế và JSON.stringify: xóa dueDate trong form tạo payload không chứa dueDate.

Hướng sửa: Trong luồng cập nhật dùng null để xóa, undefined để không đổi; sửa type frontend cho startDate hỗ trợ null. Tách payload create/update nếu cần.

### R10 — P2 — Link email mời Project trỏ tới route chưa tồn tại

Nguồn: [invitation-email.service.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/invitation-email.service.ts:37).

Project truyền acceptUrl = frontendUrl + /invitations. App Router hiện không có trang /invitations và next.config.ts không có rewrite/redirect cho đường dẫn đó. Luồng phản hồi lời mời qua chuông thông báo có implementation riêng, nên kết luận này áp dụng cho link email, không phải toàn bộ chức năng lời mời.

Xác minh: Đã đối chiếu danh sách route frontend và renderer thông báo Project. Chưa gửi email thật.

Hướng sửa: Tạo trang nhận/xử lý lời mời hoặc đổi acceptUrl sang route có thật, mở đúng invitationId và xử lý đăng nhập/hết hạn.

### R11 — P2 — Chat của task còn là mock và dùng chung state giữa các task

Nguồn: [task-chat-dialog.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/task-chat-dialog.tsx:16) và [project-detail-screen.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/screens/project-detail-screen.tsx:400).

Tin nhắn chỉ append vào useState, không gửi API/socket. Component được giữ mounted khi task=null và không reset/key theo task.id: mở chat A, gửi, đóng rồi mở B sẽ tái sử dụng danh sách tin nhắn. Empty state có ghi chú mock, nhưng chức năng này chưa đủ để cung cấp chat task thực tế.

Xác minh: Đối chiếu state, handler gửi và lifecycle tại screen; chưa thử hai tài khoản thật.

Hướng sửa: Tích hợp kênh chat gắn taskId, phân quyền và lưu lịch sử; tối thiểu tách state theo taskId và ẩn mock khỏi phạm vi phát hành chính thức.

### R12 — P2 — Validation cho phép title:null nhưng service gặp TypeError

Nguồn: [update-task.dto.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/dto/update-task.dto.ts:10) và [task.service.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/task.service.ts:148).

@IsOptional bỏ qua kiểm tra khi title=null. Service chỉ kiểm tra khác undefined rồi gọi trim, gây TypeError thay vì phản hồi lỗi input 400. Đây là lỗi API contract, không được TypeScript ngăn với dữ liệu request thực tế.

Xác minh: Đã chạy plainToInstance + validate: không có validation error; gọi TaskService.update với DTO đó gây TypeError.

Hướng sửa: Phân biệt trường cho phép null và trường chỉ được bỏ qua khi undefined. Rà tương tự name/goal/enum/boolean trong các Update DTO và kiểm tra HTTP trả 400 thay vì 500.

### R13 — P2 — Biểu đồ burndown dùng số nội suy, chưa phải lịch sử tiến độ

Nguồn: [sprint-metrics-view.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/sprint-metrics-view.tsx:58).

Đường actual gồm đúng 7 điểm được nội suy từ tổng task và số còn lại hiện tại. Không sử dụng thay đổi trạng thái theo ngày hoặc thời gian Sprint. Các lịch sử làm việc khác nhau nhưng cùng số task hoàn thành sẽ cho cùng biểu đồ, nên không đủ cơ sở gọi đó là burndown thực tế.

Xác minh: Đối chiếu công thức dựng điểm và dữ liệu đầu vào.

Hướng sửa: Thu thập snapshot hoặc dựng lịch sử từ activity đáng tin cậy; thể hiện đúng khoảng ngày Sprint và biến động phạm vi. Nếu chưa có dữ liệu lịch sử, chỉ hiển thị tiến độ hiện tại hoặc ghi rõ minh họa.

### R14 — P2 — Tạo task trong Sprint có thể thất bại nửa chừng và tạo trùng khi thử lại

Nguồn: [software-backlog-view.tsx](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/components/software-backlog-view.tsx:549) và [project-group-actions.ts](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/project-group-actions.ts:99).

Nút tạo dựa vào canCreateTask, xuất hiện cả ở Sprint ACTIVE/COMPLETED và với member không có quyền quản lý Sprint. Luồng thực hiện hai request: tạo task, rồi gán vào Sprint. Request thứ hai bị chặn nếu Sprint không PLANNED hoặc thiếu quyền quản lý; task mới đã tồn tại ở backlog. Thử lại chạy create thêm lần nữa. Lỗi này xảy ra ngay cả khi Kafka hoạt động bình thường.

Xác minh: Đã chạy action thực tế với create thành công, addTasks thất bại: gọi hai lần tạo ra hai task giả lập khác nhau.

Hướng sửa: Thống nhất điều kiện nút với policy backend. Cân nhắc API tạo task trực tiếp trong Sprint có transaction; nếu tách hai bước phải giữ id task đã tạo và chỉ retry bước gán.

### R15 — P2 — Sắp xếp 10 task trở lên sai sau khi tải lại

Nguồn: [project-group-actions.ts](E:/KLTN/hoho/workspace_hub/frontend/web/features/project/project-group-actions.ts:73), [schema.prisma](E:/KLTN/hoho/workspace_hub/backend/project-service/prisma/schema.prisma:97) và [task.service.ts](E:/KLTN/hoho/workspace_hub/backend/project-service/src/modules/project/task.service.ts:126).

Frontend gán rank là chuỗi 1000, 2000, ..., 10000. Backend lưu VARCHAR và orderBy rank tăng dần. Thứ tự chuỗi đưa 10000 trước 2000; localOrders có thể che vấn đề cho đến khi reload.

Xác minh: Đã chạy action reorder với 10 task và kiểm tra thứ tự rank chuỗi: 1,10,2,... thay vì 1,2,3,... . Chưa chạy truy vấn trên PostgreSQL thật.

Hướng sửa: Dùng rank số với migration phù hợp, hoặc chuẩn hóa chuỗi cùng chiều dài/thuật toán rank có thứ tự từ điển. Thêm kiểm tra reload sau reorder từ 10 task trở lên.

**Những phần đã có nền tảng tốt**

- JWT guard đăng ký toàn cục; controller dùng ParseUUIDPipe và ValidationPipe có whitelist/forbidNonWhitelisted.
- Quyền Owner và quyền thành viên được kiểm tra trong service, không chỉ ẩn nút frontend.
- Các thao tác quan trọng đã dùng transaction, version và xử lý write conflict; dependency có kiểm tra chu trình.
- Notification/email có outbox và retry, invitation có trạng thái/hết hạn, API danh sách có pagination.
- Frontend có tách API, hook, action, component; query và mutation phục vụ các luồng chính đã tồn tại.

Các điểm này là nền tảng, không loại bỏ các lỗi cụ thể ở trên. Outbox notification và version hiện tại không tự bảo vệ tất cả producer hoặc thao tác Sprint.

**Điều kiện còn thiếu để chốt phát hành**

1. Xử lý R01–R03 trước; hoàn thiện hoặc loại khỏi phạm vi phát hành chức năng tệp/chat mock.
2. Sửa hợp đồng dữ liệu và giao dịch Sprint/task; chạy kiểm tra hồi quy cho từng lỗi đã tái hiện.
3. Chạy integration trên PostgreSQL riêng: transaction, cạnh tranh start/add/move/complete Sprint, invitation accept/remove member và ràng buộc dữ liệu.
4. Chạy E2E ít nhất với Owner và Member có quyền khác nhau: tạo/sửa task, phân công, checklist/label/comment, tạo/gán task Sprint, kéo thả, ngày giờ, retry API lỗi và lời mời qua email/thông báo.
5. Kiểm chứng build và khởi động image production, health/readiness, mất/kết nối lại Kafka, áp dụng migration mới/cũ, backup/restore. Dockerfile có stage production, nhưng compose Project hiện chọn development và start:dev; chưa thể dùng kết quả chạy dev làm bằng chứng triển khai production.

Ưu tiên cải thiện tiếp sau correctness: giới hạn/virtualization dữ liệu giao diện và khoảng thời gian Gantt, cache nhất quán, truy cập bằng bàn phím và thống nhất ngôn ngữ. Các mục này chưa được đo tải hay kiểm tra accessibility thực tế nên không được tính là lỗi đã tái hiện trong báo cáo.

