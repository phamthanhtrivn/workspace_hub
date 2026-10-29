# Môi trường thử trợ lý công việc

## Phạm vi

Đây là môi trường mô phỏng người dùng, **không phải toàn bộ hệ thống production**:
- Frontend và module Work Assistant chạy code thật.
- Model thật lấy từ `backend/ai-service/.env`; không đọc credential từ container.
- Hội thoại lưu bằng PGlite trên filesystem, chạy SQL migration thật của AI.
- Auth, dữ liệu Project/Calendar và lỗi nguồn là fixture HTTP có kiểm tra tài khoản/phạm vi.
- Không ghi task/lịch vào database công việc hiện có.

## Dữ liệu sẵn

4 tài khoản, 3 project, 88 task project, 2 task Calendar cá nhân, 2 khoảng lịch bận, số liệu focus cá nhân:
- P1: 4 việc đang mở của An / 5 việc toàn project.
- P1: 5 hoàn thành trong 7 ngày; 3/4 đúng hạn = 75%.
- P1: 7 hoàn thành trong 30 ngày; 4/6 đúng hạn ≈ 66,7%.
- P2: dữ liệu riêng của Bình; An không được thấy.
- P3: 75 task để kiểm tra danh sách lớn và ngân sách token.
- Focus của An: 60 phút/3 phiên; không cộng focus của Bình.

Dữ liệu và bằng chứng:
- [Dataset](./dataset.json)
- [Kết quả từng ca](./results.json)
- [Các câu trả lời từ model thật](./answers.json)
- [Kiểm tra diễn đạt dễ hiểu](./natural-language-check.json)
- [Desktop](./desktop.png), [mobile](./mobile.png), [liên kết task](./task-link.png)
- [Kiểm tra đủ ba trang và liên kết task](./route-check.json)

## Mở demo hiện tại

URL: http://localhost:3100

| Tài khoản | Email | Mật khẩu chỉ dùng cho demo |
| --- | --- | --- |
| An | wa.sim.an@example.test | WaTest!2026 |
| Bình | wa.sim.binh@example.test | WaTest!2026 |
| Quản trị fixture | wa.sim.admin@example.test | WaTest!2026 |
| Chưa có dữ liệu | wa.sim.empty@example.test | WaTest!2026 |

Các tài khoản này do harness mô phỏng, không dùng để đăng nhập hệ thống thật.

## Chạy lại

Từ `workspace_hub`, terminal thứ nhất:

```powershell
node backend/scripts/work-assistant-sim/server.cjs
```

Terminal thứ hai:

```powershell
cd frontend/web
$env:NEXT_PUBLIC_API_URL='http://localhost:18110'
npm.cmd run dev -- --hostname 127.0.0.1 --port 3100
```

Terminal thứ ba, từ `workspace_hub`:

```powershell
node backend/scripts/work-assistant-sim/run.cjs
```

Runner dùng Playwright đã có ở `../.tmp/dashboard-verification/node_modules/playwright`. Có thể đặt `WORK_ASSISTANT_PLAYWRIGHT_MODULE` thành đường dẫn module Playwright khác đã cài. Không cần Docker cho harness này.

Mặc định runner giữ các kết quả đã PASS và chạy lại các ca lỗi/các lượt trình duyệt cần xác nhận. Để chạy từ đầu, đặt `WA_SIM_FRESH=1` khi khởi động server và `WA_SIM_RETEST_ALL=1` khi chạy runner. Server tạo thư mục SQL mới thay vì xóa lịch sử cũ.

Đợt chạy đầy đủ có gọi model thật. Hạn mức hiện có vẫn được áp dụng; runner chỉ thử lại một lần sau 65 giây khi nhận 429 trước khi provider được gọi. Không tự phát lại yêu cầu có kết quả không xác định.

## Điều chưa xác nhận

WA29 và toàn bộ luồng qua các service/container thật chưa hoàn tất: User Service hiện có lỗi đăng ký do cột legacy `allow_search_by_email` không có giá trị mặc định; sau đó Docker/gateway/database bị timeout. Những lỗi này không được đổi thành PASS của harness.
