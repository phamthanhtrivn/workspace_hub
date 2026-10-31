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

## User Service legacy schema

User Service dùng `ddl-auto: validate` ở local và production; không tự thêm cột khi khởi động. Database mới phải chạy migration V1 trở đi bằng SQL migration image hiện có trước khi start. Không chạy V1 trực tiếp lên database đã có bảng.

Với `user_db` local trên PostgreSQL 15 đã từng được tạo bằng Hibernate update, có thể có cột/bảng V2 xuất hiện một phần nhưng không có migration history. Công cụ sau dùng Node 22+ và `psql` trong container PostgreSQL hiện có, không cần npm dependency của User Service:

```powershell
node --env-file=backend/user-service/.env backend/user-service/scripts/reconcile-auth-schema.mjs --check
```

Mặc định chỉ đọc. Exit code 0 là schema/history tương thích, 1 là có phần cần reconcile, 2 là lỗi hoặc cấu trúc/xung đột cần xem xét thủ công. `--container` chọn container local khác; mặc định `wh_postgres`. `PGUSER` hoặc `POSTGRES_USERNAME` chọn role; công cụ chỉ nhận `user_db/public` trên PostgreSQL 15.

Trước khi áp dụng: dừng đúng User Service, tạo backup `pg_dump -Fc` và kiểm tra restore trên DB tạm. Sau khi xem báo cáo và xác nhận database là baseline legacy phù hợp:

```powershell
node --env-file=backend/user-service/.env backend/user-service/scripts/reconcile-auth-schema.mjs --apply --adopt-baseline
node --env-file=backend/user-service/.env backend/user-service/scripts/reconcile-auth-schema.mjs --check
```

Công cụ khóa cùng advisory key với migration runner, kiểm tra kiểu cột, PK/FK/check/index và xung đột danh tính trước khi sửa. Nó chỉ bổ sung phần V2/V3 thiếu, chuẩn hóa email, đặt `family_id=id` cho token chưa có family, thêm `email_verified=false` cho trạng thái chưa xác minh; không đổi token hash hoặc tự gộp tài khoản. Migration V4 giữ default lịch sử của cột legacy `allow_search_by_email`, không xóa dữ liệu cũ.

V1–V3 chỉ được ghi nhận là **baseline đã đối chiếu** sau khi kiểm chứng đủ hậu điều kiện, không được coi là vừa thực thi lại SQL gốc. V4 được thực thi thật. Repair và ghi history/checksum diễn ra trong cùng transaction; lỗi phải rollback toàn bộ. History có checksum sai hoặc migration không được hỗ trợ sẽ bị từ chối, không bị ghi đè. Giữ báo cáo baseline cùng backup local. Không dùng chế độ này tự động trong startup hoặc production rollout.

SQL migration User Service được pin LF để checksum giống nhau trên Windows và CI. Không chỉnh nội dung hoặc checksum V1–V3 đã phát hành. Sau reconcile, chạy lại migration runner để xác nhận các file đã ghi nhận được skip, rồi khởi động service với `validate` và kiểm tra `/ready`; database check hiện xác minh cả các cột/bảng auth mà không đọc dữ liệu tài khoản.

## Reconciliation dữ liệu cũ

Chạy từ thư mục service tương ứng. Các script dưới đây mặc định chỉ xuất báo cáo; `--apply` mới ghi thay đổi. Xem báo cáo trước khi áp dụng và lưu chúng ngoài thư mục public.

| Thư mục | Lệnh mặc định | Khi có `--apply` |
| --- | --- | --- |
| `backend/document-service` | `node scripts/reconcile-storage.cjs --check-objects` | Tính lại usage của version được giữ, kể cả trash; giữ file và quota limit hiện có |
| `backend/project-service` | `node scripts/reconcile-access.cjs` | Enqueue membership snapshot mới nhất để đồng bộ quyền |
| `backend/calendar-service` | `node scripts/reconcile-conferences.cjs` | Nhận legacy room chỉ sau khi kiểm host, occurrence và binding; báo các trường hợp không rõ |

Calendar reconciliation cần Communication internal endpoint và credential khớp. Một legacy room không được gán cho nhiều occurrence; script không thay một binding đã tồn tại hoặc suy conference từ location text tùy ý.

Khi Prisma engine DLL bị khóa trên Windows, dừng đúng tiến trình development sử dụng client rồi generate lại. Không xử lý bằng cách reset schema hoặc xóa dữ liệu. Cách bật LiveKit/Egress nằm trong [hướng dẫn LiveKit](../backend/livekit/README.md).
