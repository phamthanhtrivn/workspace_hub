package vn.workspacehub.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.workspacehub.project.entity.ProjectMember;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {

    boolean existsByProjectIdAndUserId(UUID projectId, UUID userId);

    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);

    List<ProjectMember> findAllByProjectIdOrderByJoinedAtAsc(UUID projectId);

    void deleteByProjectIdAndUserId(UUID projectId, UUID userId);
}
