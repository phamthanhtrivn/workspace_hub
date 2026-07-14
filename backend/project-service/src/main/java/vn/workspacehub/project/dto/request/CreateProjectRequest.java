package vn.workspacehub.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProjectRequest(
        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 20)
        String color,

        @Size(max = 10)
        String icon
) {}