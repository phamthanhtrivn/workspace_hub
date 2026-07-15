package vn.workspacehub.project.mapper;

import org.springframework.stereotype.Component;
import vn.workspacehub.project.dto.response.TaskCommentResponse;
import vn.workspacehub.project.entity.TaskComment;

@Component
public class TaskCommentMapper {

    public TaskCommentResponse toResponse(TaskComment comment) {
        return new TaskCommentResponse(
                comment.getId(),
                comment.getTask().getId(),
                comment.getAuthorId(),
                comment.getContent(),
                comment.isEdited(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}
