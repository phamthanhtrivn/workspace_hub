package vn.workspacehub.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import vn.workspacehub.project.enums.TaskPriority;
import vn.workspacehub.project.enums.TaskStatus;

import java.time.LocalDateTime;

public record CreateTaskRequest(
        @NotBlank
        @Size(max = 200)
        String title,

        String description,

        TaskPriority priority,

        TaskStatus status,

        LocalDateTime startDate,

        LocalDateTime dueDate,

        Boolean allDay,

        @PositiveOrZero
        Integer estimatedMinutes,

        @Size(max = 100)
        String rank,

        String parentTaskId,

        Boolean isParentTask,

        Boolean autoCompleteSprint
) {
}
