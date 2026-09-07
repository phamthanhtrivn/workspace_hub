# Tách component UI Project

## Goal
Giảm kích thước các page/component Project quá dài mà không thay đổi hành vi hoặc module khác.

## Tasks
- [x] Tách sidebar và toolbar của trang chi tiết dự án.
- [x] Tách phần bình luận và checklist khỏi task drawer.
- [x] Rà soát List/Software Backlog; giữ nguyên vì các khối còn lại dùng chung nhiều state kéo-thả/sprint và tách tiếp sẽ tạo prop chain lớn.
- [x] Kiểm tra lại dependency, props và giới hạn thay đổi trong Project UI.
- [x] Chạy ESLint, TypeScript và production build.

## Done When
- [x] Các component lớn giảm rõ rệt, không đổi API/luồng nghiệp vụ và frontend build thành công.
