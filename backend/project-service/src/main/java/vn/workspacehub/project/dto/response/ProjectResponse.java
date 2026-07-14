package vn.workspacehub.project.dto.response;

import vn.workspacehub.project.enums.ProjectStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        String name,
        String color,
        String icon,
        UUID ownerId,
        ProjectStatus status,
        boolean archived,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
