# Migration và reconciliation dữ liệu

Không dùng reset database, xóa volume hoặc `db push` để xử lý drift trên dữ liệu hiện có. Backup và so sánh schema/lịch sử trước khi thay đổi baseline. Không sửa checksum migration đã phát hành.

| Dịch vụ | Nguồn migration |
| --- | --- |
| User | `backend/user-service/src/main/resources/db/migration` |
| Project | `backend/project-service/database/migrations` |
| Communication, Document, Calendar, Notification | `prisma/migrations` trong từng service |
| Notebook AI | `backend/ai-service/migrations` |

User/Project production dùng SQL runner trong `deploy/shared/sql-migrations`: thứ tự file, checksum và khóa migration được giữ. Prisma services dùng `prisma migrate deploy`. Không thay SQL migration Project bằng Prisma schema push.

## Triển khai

Áp toàn bộ migration được commit cho release, không chỉ chọn các migration được nhắc trong ghi chú cũ. Dùng workflow trong [deployment](deployment.md); migration failure phải chặn rollout. Database được tạo thủ công, Hibernate update hoặc `db push` cần đối chiếu baseline riêng, không tự đánh dấu migration đã chạy.

Các thay đổi gần đây có schema cho storage lifecycle/upload intents, notification outbox, project access sync, meeting readmission và calendar conference binding. Chuẩn bị credential của các luồng liên dịch vụ trước khi triển khai. Dịch vụ nhận API/storage phải sẵn sàng trước caller và web; kiểm readiness sau mỗi đợt.

Các thay đổi hành vi cần thông báo khi release: người dùng có thể phải đăng nhập lại sau thay đổi auth; PUBLIC channel yêu cầu thành viên space; upload/attachment/import mới áp cap 10 MiB, trong khi tài liệu cũ vẫn tải được.

## Reconciliation dữ liệu cũ

Chạy từ thư mục service tương ứng. Các script dưới đây mặc định chỉ xuất báo cáo; `--apply` mới ghi thay đổi. Xem báo cáo trước khi áp dụng và lưu chúng ngoài thư mục public.

| Thư mục | Lệnh mặc định | Khi có `--apply` |
| --- | --- | --- |
| `backend/document-service` | `node scripts/reconcile-storage.cjs --check-objects` | Tính lại usage của version được giữ, kể cả trash; giữ file và quota limit hiện có |
| `backend/project-service` | `node scripts/reconcile-access.cjs` | Enqueue membership snapshot mới nhất để đồng bộ quyền |
| `backend/calendar-service` | `node scripts/reconcile-conferences.cjs` | Nhận legacy room chỉ sau khi kiểm host, occurrence và binding; báo các trường hợp không rõ |

Calendar reconciliation cần Communication internal endpoint và credential khớp. Một legacy room không được gán cho nhiều occurrence; script không thay một binding đã tồn tại hoặc suy conference từ location text tùy ý.

Khi Prisma engine DLL bị khóa trên Windows, dừng đúng tiến trình development sử dụng client rồi generate lại. Không xử lý bằng cách reset schema hoặc xóa dữ liệu. Cách bật LiveKit/Egress nằm trong [hướng dẫn LiveKit](../backend/livekit/README.md).
