package vn.workspacehub.project.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddProjectMemberRequest(
        @NotNull
        UUID userId
) {
}
