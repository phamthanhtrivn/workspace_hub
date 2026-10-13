# Dashboard — Personal Work Hub

Mục tiêu: từ /dashboard, người dùng biết việc cần làm hôm nay, lịch sắp tới và trạng thái tập trung; dùng dữ liệu thật và hành động của các module hiện có.

## Thư viện và kiến trúc
- Giữ Next.js/React, Tailwind và components/ui hiện có; theo token trong DESIGN.md.
- Dùng TanStack Query và Axios hiện có cho dữ liệu; tái sử dụng query key của từng feature, xử lý loading/error/retry riêng từng widget.
- Dùng temporal-polyfill hiện có để xác định ngày theo múi giờ người dùng; ranh giới ngày là đầu ngày đến đầu ngày kế tiếp, chuyển sang UTC khi gọi API. Dùng Intl để định dạng giờ.
- Thêm Recharts cho biểu đồ focus 7 ngày; react-is phải cùng phiên bản React (hiện 19.2.4). Nạp chart riêng, có mô tả số liệu bằng chữ.
- My Day dùng danh sách timeline React và CSS Grid; không cần thư viện lịch hoặc kéo thả cho V1.
- Focus dùng PomodoroSessionProvider, usePomodoroSession và usePomodoroSessionActions hiện có; không mount thêm timer/provider.
- V1 gọi API hiện có. Chỉ bổ sung API khi xác nhận thiếu dữ liệu/quyền/filter; đánh giá BFF sau khi đo số request và độ trễ.

## Phạm vi
V1: greeting, 4 summary cards, My Day, My Tasks, Focus, Upcoming Meeting.
V1 mở rộng: tối đa 3 active projects, productivity 7 ngày, 5 recent documents và 5 notifications.
Để sau: AI brief, tùy biến/kéo thả widget, analytics nâng cao.

## Các bước triển khai
- [x] Đối chiếu API: task cá nhân lấy từ Calendar; task dự án lấy qua projects ACTIVE/hasAssignedTasks và tasks onlyMine, có kiểm tra assignee và quyền từ members. Không cần backend mới.
- [x] Tạo features/dashboard/{api,components,hooks,utils,types}; page.tsx chỉ render dashboard-view. Query theo user, ngày và timezone; giữ source ID và occurrence để điều hướng/dedup.
- [x] Dựng layout theo DESIGN.md: desktop hai cột, mobile một cột; skeleton, empty, error và retry riêng widget.
- [x] Nối summary/My Day/My Tasks; giữ task quá hạn và không deadline. Bộ lọc All/Overdue/Today; task chỉ có ngày nằm khu all-day. Loại trùng conference theo event ID, source ID và meeting URL.
- [x] Nối Complete theo nguồn/quyền; invalidation task detail, calendar, projects và focus options. Focus dùng provider hiện có; không tạo timer mới.
- [x] Nối 3 upcoming meetings với Join/Start và Accept/Decline theo role/status. My Day đọc thêm các trang meeting cần thiết để không bị giới hạn ở 3 cuộc họp.
- [x] Thêm 3 active projects, progress không tính cancelled, chart focus 7 ngày từ API sessions hiện có, documents preview và notification details/deep links. Tạo nhanh personal task/event/meeting và upload document.
- [x] Kiểm chứng cuối: production build/TypeScript, ESLint và 8 unit tests đã đạt; Edge headless đã kiểm tra desktop/mobile, task completion, timer, modal và submit event, notification, lỗi service/retry và empty states. Build đạt khi chạy độc lập sau khi dừng dev server.

## Tài liệu tham khảo
- https://github.com/recharts/recharts — cài recharts/react-is và yêu cầu khớp phiên bản React.
- https://tanstack.com/query/latest/docs/framework/react/guides/parallel-queries — query độc lập và useQueries cho danh sách động.
- https://moment.github.io/luxon/api-docs/index.html — xử lý DateTime và múi giờ.

## Giới hạn kiểm chứng
API được intercept trong bài kiểm tra trình duyệt, không thay đổi dữ liệu thật. Cần smoke test với backend và tài khoản thật để xác nhận quyền/luồng invitation, upload và focus theo task end-to-end. Ứng dụng không chứa dữ liệu mock.

Dependency audit: 15 cảnh báo (2 moderate, 12 high, 1 critical), trùng với baseline trước thay đổi; không thêm cảnh báo mới từ Recharts/react-is.
