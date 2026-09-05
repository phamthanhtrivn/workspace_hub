# Hoàn thiện Project sau review

Phạm vi: xử lý R01–R15 trong PROJECT_PRODUCTION_REVIEW.md, giữ chức năng hiện có và thay dữ liệu mock bằng lưu trữ thật.

- [ ] R01: lưu sự kiện Calendar qua outbox cùng transaction; kiểm tra lỗi Kafka không làm request đã lưu thất bại.
- [ ] R04/R05/R14: bảo vệ giao dịch Sprint và cây task, tạo task trong Sprint nguyên tử; kiểm tra chuyển Sprint và retry.
- [ ] R03/R09/R12/R15: chuẩn hóa ngày giờ, null và rank; kiểm tra input/round-trip và thứ tự 10+ task.
- [ ] R06/R07/R08: thống nhất task detail/cache và xử lý lỗi; kiểm tra API lỗi không báo thành công.
- [ ] R02/R11: kết nối lưu tệp và trao đổi task thật với quyền Project, kiểm tra tải lại và đổi task.
- [ ] R10/R13: sửa đường dẫn lời mời và thay biểu đồ thiếu dữ liệu lịch sử bằng tiến độ hiện tại được ghi nhãn đúng.
- [ ] Kiểm chứng: regression tests, lint/typecheck/build, kiểm tra hạ tầng khả dụng; cập nhật báo cáo trạng thái và giới hạn thực tế.

Quyết định: giữ Sprint chỉ nhận task khi PLANNED theo policy hiện tại; cây task hai tầng; thời điểm có giờ gửi ISO UTC, all-day giữ ngày lịch; không suy diễn lịch sử burndown khi chưa có dữ liệu.
