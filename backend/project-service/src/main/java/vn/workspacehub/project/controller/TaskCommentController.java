package vn.workspacehub.project.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import vn.workspacehub.project.common.ApiResponse;
import vn.workspacehub.project.dto.request.CreateTaskCommentRequest;
import vn.workspacehub.project.dto.request.UpdateTaskCommentRequest;
import vn.workspacehub.project.dto.response.TaskCommentResponse;
import vn.workspacehub.project.services.TaskCommentService;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class TaskCommentController {

    private final TaskCommentService commentService;

    @GetMapping("/api/tasks/{taskId}/comments")
    public ResponseEntity<ApiResponse<List<TaskCommentResponse>>> findAll(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID taskId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.findAll(currentUserId, taskId),
                "Lấy danh sách comment thành công"
        ));
    }

    @PostMapping("/api/tasks/{taskId}/comments")
    public ResponseEntity<ApiResponse<TaskCommentResponse>> create(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID taskId,
            @Valid @RequestBody CreateTaskCommentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.create(currentUserId, taskId, request),
                "Thêm comment thành công"
        ));
    }

    @PatchMapping("/api/task-comments/{commentId}")
    public ResponseEntity<ApiResponse<TaskCommentResponse>> update(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID commentId,
            @Valid @RequestBody UpdateTaskCommentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.update(currentUserId, commentId, request),
                "Cập nhật comment thành công"
        ));
    }

    @DeleteMapping("/api/task-comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID commentId
    ) {
        commentService.delete(currentUserId, commentId);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa comment thành công"));
    }
}
