package vn.workspacehub.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.workspacehub.project.entity.TaskComment;

import java.util.List;
import java.util.UUID;

public interface TaskCommentRepository extends JpaRepository<TaskComment, UUID> {

    List<TaskComment> findAllByTaskIdOrderByCreatedAtAsc(UUID taskId);
}
