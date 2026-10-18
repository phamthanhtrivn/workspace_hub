# Plan cập nhật metadata và SEO cho toàn bộ web

Trạng thái: đã triển khai ngày 2026-10-18 cho đủ 17 route `page.tsx` trong `frontend/web/app`. Theo xác nhận của người dùng, chưa có domain production nên indexing vẫn tắt; `SITE_URL` để trống và `SITE_INDEXABLE=false`. Hướng dẫn vận hành ở `docs/seo-metadata.md`.

## 1. Hiện trạng trước triển khai đã xác minh

- `app/layout.tsx` có title thương hiệu và description chung, còn quảng bá AI dù tính năng chưa khả dụng.
- Chỉ `app/(workspace)/documents/page.tsx` có metadata riêng; description tiếng Việt chưa đồng nhất với `<html lang="en">` và nội dung giao diện tiếng Anh.
- Chưa có `metadataBase`, title template, canonical, Open Graph, Twitter card, `robots.ts` hoặc `sitemap.ts` trong source app.
- Có favicon hiện tại; chưa có ảnh Open Graph của WorkspaceHub trong source app/public. Không thay logo tùy tiện.
- Bảy page có `"use client"`: trang chủ, login, register, forgot-password, shared document, Pomodoro, Projects.
- Settings và Notifications đang là dialog/panel, không có page riêng; không tạo route chỉ để thêm metadata.
- Bộ đếm Pomodoro nằm trong provider cấp workspace và ghi `document.title`; cần phối hợp với title của route để không khôi phục nhầm title cũ.
- Deployment frontend chưa truyền cấu hình site origin/indexing chuyên dụng. `NODE_ENV=production` riêng lẻ không phân biệt production thật với preview.

## 2. Mục tiêu và chính sách index

- Mọi page có title và description đúng chức năng, hiển thị ngay từ HTML server; không dựa vào effect client để cung cấp SEO metadata.
- Chỉ trang chủ được index trong lần triển khai này. Auth, workspace và tài liệu chia sẻ mặc định không index.
- Metadata chỉ dùng nội dung chung đã duyệt; không đưa tên task, project, meeting, document, người dùng, invitation ID hoặc join token vào title/description/ảnh chia sẻ.
- Giữ tiếng Anh theo giao diện hiện tại; không thêm `hreflang` khi chưa có các URL ngôn ngữ tương ứng.
- Giữ layout, theme, auth, permissions, query parameters và nghiệp vụ hiện tại. `noindex` không thay thế bảo vệ truy cập.

## 3. Danh mục đủ 17 page

Ngoại trừ trang chủ, title cuối cùng theo mẫu `<Tên trang> | WorkspaceHub`. Mỗi dòng có description riêng dựa trên mục đích bên dưới; không sao chép description trang chủ vào tất cả các page.

| Route | Title | Nội dung description | Index production |
|---|---|---|---|
| `/` | WorkspaceHub — Projects, Tasks & Team Collaboration | Quản lý project, task, lịch, tài liệu, cộng tác và phiên tập trung; không quảng bá AI sắp ra mắt | Có |
| `/login` | Sign In | Đăng nhập để truy cập workspace | Không |
| `/register` | Create Account | Tạo tài khoản WorkspaceHub | Không |
| `/forgot-password` | Reset Password | Khôi phục quyền truy cập tài khoản | Không |
| `/dashboard` | Dashboard | Tổng quan công việc, lịch và hoạt động cá nhân | Không |
| `/projects` | Projects | Quản lý các project và tiến độ | Không |
| `/projects/[id]` | Project Details | Các view và tài nguyên của project, không dùng tên project thật | Không |
| `/projects/invitations` | Project Invitations | Xem và phản hồi lời mời tham gia project | Không |
| `/tasks` | Tasks | Truy cập luồng quản lý task trong Projects, Calendar và Dashboard | Không |
| `/calendar` | Calendar | Quản lý lịch, event và task theo thời gian | Không |
| `/pomodoro` | Pomodoro Timer | Làm việc tập trung và quản lý phiên nghỉ | Không |
| `/chat` | Messages | Trò chuyện trong channel, tin nhắn trực tiếp và thread | Không |
| `/meetings` | Meetings | Tạo, tham gia và quản lý cuộc họp | Không |
| `/meetings/[joinToken]` | Meeting Room | Tham gia cuộc họp theo quyền truy cập hiện tại; không chứa token | Không |
| `/documents` | Documents | Quản lý, tìm kiếm và chia sẻ tài liệu | Không |
| `/documents/shared/[id]` | Shared Document | Mở tài liệu được chia sẻ theo quyền hiện tại; không tiết lộ tên/nội dung | Không |
| `/ai` | AI Assistant — Coming Soon | Thông báo tính năng chưa khả dụng | Không |

## 4. Nền tảng metadata dùng chung

1. Tạo config server dùng chung, ví dụ `lib/seo.ts`, với brand, site origin, chế độ indexing, metadata của các page và helper typed `Metadata`. Giữ config nhỏ, không tạo framework SEO riêng.
2. Cấu hình `SITE_URL` là origin HTTPS production được xác nhận; không suy ra từ API URL, asset host hoặc request Host chưa xác thực. Không tự đoán domain.
3. Cấu hình `SITE_INDEXABLE` bật rõ ràng trên production công khai, mặc định tắt ở local/preview/staging. Khi bật indexing mà origin thiếu/sai thì báo lỗi cấu hình, không phát canonical localhost.
4. Đồng bộ env với frontend Docker build/runtime và nơi build image hiện có. Metadata tĩnh có thể được chốt khi build; không chỉ truyền env vào container sau build rồi giả định HTML đã đổi. Ghi rõ ảnh build dành cho origin nào, tránh promote nhầm cấu hình preview.
5. Root layout khai báo `metadataBase`, `applicationName`, `title.default`, `title.template: "%s | WorkspaceHub"` và description thương hiệu đã sửa. Root mặc định `noindex`; trang chủ chỉ override khi site cho phép index.
6. Dùng title tuyệt đối cho homepage để không bị lặp thương hiệu; sửa Documents từ title đã chứa `| WorkspaceHub` sang tên trang đơn.
7. Metadata có object lồng nhau như `robots` và `openGraph` phải được compose đầy đủ: Next.js merge nông và child có thể thay toàn bộ object của parent.

## 5. Áp dụng vào các route

- Export `metadata` ở Server Component của từng page; đặt robots mặc định theo nhóm `(workspace)` và `(auth)` để route mới không vô tình index.
- Với bảy Client page: bỏ `"use client"` khi page chỉ compose giao diện; nếu có hooks/browser API thì chuyển phần render tương tác sang feature component rồi giữ `page.tsx` làm server wrapper. Đọc đủ file trước khi chọn cách tách.
- Shared document cần server wrapper riêng, giữ nguyên client fetching/preview/permission hiện có. Không fetch nội dung tài liệu chỉ để tạo metadata.
- Project detail và meeting room dùng title chung ổn định, không thêm authenticated server fetch hoặc sửa API để lấy tên riêng. Giữ `params` dạng Promise của Next.js 16 khi route cần đọc params.
- Các filter, tab, search, returnTo, invitation ID và token không được đưa vào metadata hay URL chia sẻ. Không tạo metadata riêng cho mỗi query variation.
- Giữ bộ đếm Pomodoro hiện có trên các trang workspace khi phiên chạy. Title nền phải theo route hiện tại; khi pause/reset/kết thúc phải trả lại đúng title route, kể cả vừa điều hướng trong lúc chạy. Chỉ chỉnh phối hợp title, không chỉnh timer/session logic.

## 6. Canonical, ảnh chia sẻ, robots và sitemap

- Canonical trang chủ trỏ chính xác origin + `/`, bỏ query và fragment. Không đặt canonical `/` ở root để mọi page vô tình trỏ về trang chủ.
- Các route không index không cần canonical/`og:url` chứa ID/token. Không canonical toàn bộ private routes về `/`.
- Homepage có Open Graph `website`, site name, title, description, URL, locale phù hợp tiếng Anh và Twitter `summary_large_image`.
- Tạo ảnh chia sẻ trung tính 1200×630 bằng `next/og` có sẵn hoặc asset local của dự án, đúng palette navy và brand, có alt text. Không đưa nội dung workspace lên ảnh; không thêm package. Tránh file-based metadata tự sinh URL nhạy cảm cho private routes qua kế thừa.
- Rà favicon hiện tại và icon hiển thị tab; chỉ thay nếu còn icon mẫu Next.js, dùng nhận diện WorkspaceHub hiện có. Không mở rộng sang PWA/manifest ngoài phạm vi.
- Thêm `app/robots.ts`: production cho crawler đọc homepage và metadata `noindex`; không chặn các route cần crawler đọc `noindex`, không chặn CSS/JS. Staging/preview không phát nội dung cho index, sitemap rỗng. Không coi `Disallow` là cơ chế xóa URL khỏi search.
- Thêm `app/sitemap.ts`: allowlist chỉ `/` trong production hiện tại; không liệt kê auth/private/shared/meeting/invitation/query URL. Preview/staging trả danh sách rỗng. Không bịa `lastModified` bằng thời gian của mọi request.
- Chưa thêm schema rating, review, pricing hoặc SearchAction không có trong sản phẩm. Structured data chỉ mở rộng sau nếu có nội dung public đủ căn cứ.

## 7. Thứ tự triển khai

1. Chốt origin production và nơi truyền cấu hình indexing; thêm helper/config và root metadata.
2. Chuyển server/client boundary cần thiết, bổ sung title/description cho đủ 17 page.
3. Áp dụng robots theo nhóm và shared document; xử lý title Pomodoro khi chuyển route.
4. Bổ sung homepage canonical, OG/Twitter, ảnh chia sẻ và rà favicon.
5. Bổ sung robots/sitemap, nối cấu hình deployment frontend tối thiểu và cập nhật tài liệu env.
6. Kiểm tra một lượt và ghi coverage/giới hạn runtime trong audit hiện có.

## 8. Kiểm tra vừa đủ và tiêu chí hoàn tất

- Chạy ESLint cho file sửa, TypeScript một lần và production build một lần nếu env hiện có đủ; không cài package hoặc tạo test/script/cache riêng.
- Rà metadata coverage đủ 17 route; không trùng suffix thương hiệu; title/description khớp ngôn ngữ và chức năng.
- Kiểm tra HTML server của homepage, một auth page, một private page và shared document; dùng ID giả, không đưa token thật vào output kiểm tra. Không chỉ kiểm tra DOM sau hydration.
- Kiểm tra homepage canonical/OG image URL/ảnh trả đúng, `/robots.txt`, `/sitemap.xml`; xác nhận sitemap không chứa private URL.
- Kiểm tra indexing bật/tắt theo config production/preview; không để localhost hoặc preview origin lọt vào canonical production.
- Kiểm tra nhanh điều hướng giữa các module và Pomodoro chạy/pause/kết thúc để title nền không cũ; không làm mất countdown.
- Xác nhận không có tên tài liệu/project/user hoặc token trong head; không phát sinh authenticated request cho metadata.
- Nếu browser hoặc env build không đủ, ghi rõ mục chưa thực hiện. Không hứa hẹn thứ hạng Google từ thay đổi metadata.
- Không deploy hay gửi sitemap lên Search Console trong phạm vi implementation; các thao tác tài khoản đó thực hiện khi có yêu cầu riêng.

## Tài liệu đối chiếu

- Next.js Metadata API (đã đối chiếu thêm hướng dẫn Next.js 16.2.9 trong `node_modules`): https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Google về noindex và việc crawler phải truy cập được chỉ thị: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Google về sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
