package vn.workspacehub.project.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.workspacehub.project.common.ApiResponse;
import vn.workspacehub.project.dto.request.CreateProjectRequest;
import vn.workspacehub.project.dto.request.UpdateProjectRequest;
import vn.workspacehub.project.dto.response.ProjectResponse;
import vn.workspacehub.project.services.ProjectService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @Valid @RequestBody CreateProjectRequest request
    ) {
        ProjectResponse project = projectService.create(currentUserId, request);

        return ResponseEntity.ok(
                ApiResponse.success(project, "Tạo project thành công")
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getProjects(
            @RequestHeader("X-User-Id") UUID currentUserId
    ) {
        List<ProjectResponse> projects = projectService.findAllForUser(currentUserId);

        return ResponseEntity.ok(
                ApiResponse.success(projects, "Lấy danh sách project thành công")
        );
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProject(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId
    ) {
        ProjectResponse project = projectService.findByIdForUser(currentUserId, projectId);

        return ResponseEntity.ok(
                ApiResponse.success(project, "Lấy thông tin project thành công")
        );
    }

    @PatchMapping("/{projectId}")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateProjectRequest request
    ) {
        ProjectResponse project = projectService.update(currentUserId, projectId, request);

        return ResponseEntity.ok(
                ApiResponse.success(project, "Cập nhật project thành công")
        );
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<ApiResponse<Void>> archiveProject(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId
    ) {
        projectService.archive(currentUserId, projectId);

        return ResponseEntity.ok(
                ApiResponse.success(null, "Archive project thành công")
        );
    }
}
