package vn.workspacehub.project.dto.request;

import jakarta.validation.constraints.NotNull;
import vn.workspacehub.project.enums.ProjectRole;

public record UpdateProjectMemberRoleRequest(
        @NotNull
        ProjectRole role
) {
}
