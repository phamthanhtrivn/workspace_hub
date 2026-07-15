package vn.workspacehub.project.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.workspacehub.project.common.ApiResponse;
import vn.workspacehub.project.dto.request.CreateTaskRequest;
import vn.workspacehub.project.dto.request.UpdateTaskRequest;
import vn.workspacehub.project.dto.response.TaskResponse;
import vn.workspacehub.project.services.TaskService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping("/projects/{projectId}/tasks")
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateTaskRequest request
    ) {
        TaskResponse task = taskService.create(currentUserId, projectId, request);
        return ResponseEntity.ok(ApiResponse.success(task, "Tạo task thành công"));
    }

    @GetMapping("/projects/{projectId}/tasks")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getProjectTasks(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId
    ) {
        List<TaskResponse> tasks = taskService.findAllByProject(currentUserId, projectId);
        return ResponseEntity.ok(ApiResponse.success(tasks, "Lấy danh sách task thành công"));
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> getTask(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID taskId
    ) {
        TaskResponse task = taskService.findById(currentUserId, taskId);
        return ResponseEntity.ok(ApiResponse.success(task, "Lấy thông tin task thành công"));
    }

    @PatchMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID taskId,
            @Valid @RequestBody UpdateTaskRequest request
    ) {
        TaskResponse task = taskService.update(currentUserId, taskId, request);
        return ResponseEntity.ok(ApiResponse.success(task, "Cập nhật task thành công"));
    }
}
