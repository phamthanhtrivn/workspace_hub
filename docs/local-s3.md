# S3 private cho local/dev

Local dùng bucket `workspacehub-s3-bucket` tại `ap-southeast-1` và một IAM user
riêng cho ứng dụng. User, Document, Communication và Calendar dùng cùng
credential local; AI truy cập file qua các API Document/Communication.

Các file `.env` và `.env.docker` của bốn service có `AWS_S3_BUCKET_NAME`,
`AWS_REGION`, `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`. Không đặt credential trong
frontend hoặc commit chúng. Frontend chỉ có `NEXT_PUBLIC_ASSET_HOST` chứa
hostname S3. Env local không còn dùng `AWS_CLOUDFRONT_URL`.

## Cấu hình bucket

- Block Public Access: bật cả bốn mục.
- Object Ownership: Bucket owner enforced, ACL disabled.
- Encryption: SSE-S3. SSE-KMS cần quyền KMS bổ sung, ngoài cấu hình local này.
- CORS cho `http://localhost:3000`, phương thức `PUT`, `GET`, `HEAD`, cho phép
  các header upload đã ký; expose `ETag`, `Content-Length`, `Content-Range`,
  `Accept-Ranges`.
- IAM policy ứng dụng giới hạn ở bucket này: đọc/ghi/xóa `avatars/*`,
  `documents/*`, `chat-media/*`, `recordings/*`; đọc `pomodoro-audio/*`;
  thêm quyền abort/list parts cho multipart recording. Copy object dùng quyền
  đọc nguồn và ghi đích. Runtime không cần quyền quản trị bucket/IAM.

## Avatar

```text
avatars/staging/{userId}/{uploadId}.ext
avatars/users/{userId}/{fileId}.ext
```

Upload vào staging bằng presigned PUT, gọi confirm để backend kiểm tra bytes,
MIME, kích thước và copy sang key cuối. Chỉ avatar đã confirm mới được gắn
profile. Cleanup phân biệt rõ staging với avatar người dùng đang sử dụng.
Upload cũ trước khi đổi cấu hình phải thực hiện lại.

`avatarUrl` của avatar mới là reference ổn định
`/api/users/avatars/{userId}/{fileId}.ext`. Request có access token và phiên hợp
lệ mới nhận `{ data: { url, expiresAt } }`; backend chỉ cấp URL cho avatar hiện
tại hoặc bản preview đã confirm của chính chủ. URL S3 đọc có hạn 120 giây.
Frontend tự resolve reference và không lưu URL ký vào profile/JWT/snapshot.
Avatar Google hiện có vẫn là tài nguyên do Google quản lý.

Tính năng avatar channel đã bỏ, gồm API presign và client liên quan. Không có
prefix `avatar/` hoặc `avatars/channels/` trong luồng mới.

## Chat, audio và recording

- Media chat trả reference `/api/medias/access-url?key=...`. Backend đối chiếu
  media với message chưa xóa/thu hồi và kiểm tra quyền channel, DM hoặc meeting
  trước khi cấp URL đọc 120 giây. Lỗi dependency không bỏ qua kiểm tra quyền.
- Thư viện Pomodoro mặc định gồm 5 bài nhạc CC BY 4.0, được đóng gói tại
  `frontend/web/public/assets/sounds/` và có sẵn kể cả khi thư viện DB chưa có dữ liệu.
  Bản ghi DB trùng ID được ưu tiên; bản ghi đã tắt không được thay bằng âm thanh mặc định.
  Nguồn và giấy phép của 5 bài nhạc được ghi trong `credits.txt` cùng thư mục;
  người dùng có thể mở qua liên kết **Music credits** trong bộ chọn âm thanh.
- Audio Pomodoro cấu hình thêm trong DB trả reference theo audio ID. API có xác thực chỉ ký key thuộc
  `pomodoro-audio/` của bản ghi audio đang active; URL đọc có hạn một giờ.
- Bucket mới rỗng nên cần upload audio hợp lệ bằng tài khoản quản trị vào
  `pomodoro-audio/` và tạo/cập nhật metadata audio tương ứng nếu muốn sử dụng
  các bài từ S3. Đổi bucket không tự tạo audio hoặc sao chép file cũ.
- Recording giữ luồng cấp URL sau kiểm tra quyền hiện có; Egress nhận credential
  từ Communication. Document tiếp tục streaming có kiểm tra quyền; URL nội bộ
  cho AI vẫn được ký ngắn hạn theo contract hiện có.

Presigned URL là bearer URL: người có URL có thể dùng nó đến khi hết hạn.
Logout/thu hồi quyền chặn việc cấp URL mới, không thu hồi bytes đã tải hoặc cam
kết vô hiệu hóa ngay URL đã cấp. Frontend phân biệt cache theo người đăng nhập
và xin URL mới khi cần; không dùng Next image optimizer cho URL private đã ký.

## Chuyển cấu hình

Dừng các service trước khi thay credential/bucket, rồi restart backend và
frontend sau khi cập nhật. Không copy dữ liệu từ bucket cũ và không xóa bucket,
object hay metadata cũ trong đợt này. URL public CloudFront/S3 cũ không được dùng
làm fallback để vượt qua luồng private; cần upload lại file muốn sử dụng.

Cấu hình production/EC2 và policy của bucket cũ cần rollout riêng; tài liệu
deployment cũ không chứng minh môi trường đó đã chuyển sang bucket mới.
