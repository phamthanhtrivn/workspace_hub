package vn.workspacehub.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateTaskCommentRequest(
        @NotBlank
        @Size(max = 5000)
        String content
) {
}
