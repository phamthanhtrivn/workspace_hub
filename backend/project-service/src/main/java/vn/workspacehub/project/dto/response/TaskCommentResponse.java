package vn.workspacehub.project.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record TaskCommentResponse(
        UUID id,
        UUID taskId,
        UUID authorId,
        String content,
        boolean edited,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
