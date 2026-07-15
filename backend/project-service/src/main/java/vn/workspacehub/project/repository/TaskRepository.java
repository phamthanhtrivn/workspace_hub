package vn.workspacehub.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.workspacehub.project.entity.Task;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findAllByProjectIdAndArchivedFalseOrderByRankAscCreatedAtAsc(UUID projectId);

    Optional<Task> findByIdAndProjectId(UUID taskId, UUID projectId);
}
