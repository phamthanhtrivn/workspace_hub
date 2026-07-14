package vn.workspacehub.project.dto.response;

import vn.workspacehub.project.enums.ProjectRole;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectMemberResponse(
        UUID id,
        UUID userId,
        ProjectRole role,
        LocalDateTime joinedAt
) {
}
