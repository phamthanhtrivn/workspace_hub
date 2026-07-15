package vn.workspacehub.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTaskCommentRequest(
        @NotBlank
        @Size(max = 5000)
        String content
) {
}
