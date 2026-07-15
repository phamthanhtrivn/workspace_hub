package vn.workspacehub.project.dto.response;

import vn.workspacehub.project.enums.InvitationStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectInvitationResponse(
        UUID id,
        UUID projectId,
        String projectName,
        UUID invitedUserId,
        UUID invitedBy,
        InvitationStatus status,
        LocalDateTime createdAt,
        LocalDateTime respondedAt,
        LocalDateTime expiresAt
) {
}
