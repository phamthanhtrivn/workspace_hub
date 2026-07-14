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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.workspacehub.project.common.ApiResponse;
import vn.workspacehub.project.dto.request.AddProjectMemberRequest;
import vn.workspacehub.project.dto.request.UpdateProjectMemberRoleRequest;
import vn.workspacehub.project.dto.response.ProjectMemberResponse;
import vn.workspacehub.project.services.ProjectMemberService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
@RequiredArgsConstructor
public class ProjectMemberController {

    private final ProjectMemberService projectMemberService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectMemberResponse>>> getMembers(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId
    ) {
        List<ProjectMemberResponse> members =
                projectMemberService.findAll(currentUserId, projectId);

        return ResponseEntity.ok(
                ApiResponse.success(members, "Lấy danh sách thành viên thành công")
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> addMember(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId,
            @Valid @RequestBody AddProjectMemberRequest request
    ) {
        ProjectMemberResponse member =
                projectMemberService.add(currentUserId, projectId, request);

        return ResponseEntity.ok(
                ApiResponse.success(member, "Thêm thành viên thành công")
        );
    }

    @PatchMapping("/{memberUserId}")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> updateMemberRole(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId,
            @PathVariable UUID memberUserId,
            @Valid @RequestBody UpdateProjectMemberRoleRequest request
    ) {
        ProjectMemberResponse member = projectMemberService.updateRole(
                currentUserId,
                projectId,
                memberUserId,
                request
        );

        return ResponseEntity.ok(
                ApiResponse.success(member, "Cập nhật vai trò thành công")
        );
    }

    @DeleteMapping("/{memberUserId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId,
            @PathVariable UUID memberUserId
    ) {
        projectMemberService.remove(currentUserId, projectId, memberUserId);

        return ResponseEntity.ok(
                ApiResponse.success(null, "Xoá thành viên thành công")
        );
    }
}
