package vn.workspacehub.project.dto.response;

import vn.workspacehub.project.enums.TaskPriority;
import vn.workspacehub.project.enums.TaskStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        UUID projectId,
        UUID parentTaskId,
        int childCount,
        String title,
        String description,
        TaskPriority priority,
        TaskStatus status,
        UUID createdBy,
        UUID reporterId,
        LocalDateTime startDate,
        LocalDateTime dueDate,
        boolean allDay,
        LocalDateTime completedAt,
        int estimatedMinutes,
        String rank,
        boolean archived,
        boolean isParentTask,
        boolean autoCompleteSprint,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
