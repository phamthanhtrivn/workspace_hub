package vn.workspacehub.project.mapper;

import org.springframework.stereotype.Component;
import vn.workspacehub.project.dto.response.TaskResponse;
import vn.workspacehub.project.entity.Task;

@Component
public class TaskMapper {

    public TaskResponse toResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getProject().getId(),
                task.getParent() == null ? null : task.getParent().getId(),
                // The frontend derives this count from the flat project task list.
                // Avoid touching the lazy self-reference here (prevents N+1 queries).
                0,
                task.getTitle(),
                task.getDescription(),
                task.getPriority(),
                task.getStatus(),
                task.getCreatedBy(),
                task.getReporterId(),
                task.getStartDate(),
                task.getDueDate(),
                task.isAllDay(),
                task.getCompletedAt(),
                task.getEstimatedMinutes(),
                task.getRank(),
                task.isArchived(),
                Boolean.TRUE.equals(task.getParentTask()),
                Boolean.TRUE.equals(task.getAutoCompleteSprint()),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
