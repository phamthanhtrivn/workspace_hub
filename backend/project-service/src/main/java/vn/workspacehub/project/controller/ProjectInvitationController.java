package vn.workspacehub.project.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.workspacehub.project.common.ApiResponse;
import vn.workspacehub.project.dto.request.CreateProjectInvitationRequest;
import vn.workspacehub.project.dto.response.ProjectInvitationResponse;
import vn.workspacehub.project.services.ProjectInvitationService;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ProjectInvitationController {

    private final ProjectInvitationService invitationService;

    @PostMapping("/api/projects/{projectId}/invitations")
    public ResponseEntity<ApiResponse<ProjectInvitationResponse>> createInvitation(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateProjectInvitationRequest request
    ) {
        ProjectInvitationResponse invitation = invitationService.create(
                currentUserId,
                projectId,
                request
        );
        return ResponseEntity.ok(ApiResponse.success(invitation, "Gửi lời mời thành công"));
    }

    @GetMapping("/api/project-invitations/pending")
    public ResponseEntity<ApiResponse<List<ProjectInvitationResponse>>> findPending(
            @RequestHeader("X-User-Id") UUID currentUserId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                invitationService.findPending(currentUserId),
                "Lấy danh sách lời mời thành công"
        ));
    }

    @PostMapping("/api/project-invitations/{invitationId}/accept")
    public ResponseEntity<ApiResponse<ProjectInvitationResponse>> accept(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID invitationId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                invitationService.accept(currentUserId, invitationId),
                "Đã chấp nhận lời mời"
        ));
    }

    @PostMapping("/api/project-invitations/{invitationId}/decline")
    public ResponseEntity<ApiResponse<ProjectInvitationResponse>> decline(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID invitationId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                invitationService.decline(currentUserId, invitationId),
                "Đã từ chối lời mời"
        ));
    }

    @DeleteMapping("/api/projects/{projectId}/invitations/{invitationId}")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID projectId,
            @PathVariable UUID invitationId
    ) {
        invitationService.cancel(currentUserId, projectId, invitationId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã hủy lời mời"));
    }
}
