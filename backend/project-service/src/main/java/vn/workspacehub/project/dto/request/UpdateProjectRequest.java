package vn.workspacehub.project.dto.request;

import jakarta.validation.constraints.Size;
import vn.workspacehub.project.enums.ProjectStatus;

public record UpdateProjectRequest(
        @Size(max = 100)
        String name,

        @Size(max = 20)
        String color,

        @Size(max = 10)
        String icon,

        ProjectStatus status
) {
}
