package vn.workspacehub.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.workspacehub.project.entity.ProjectInvitation;
import vn.workspacehub.project.enums.InvitationStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectInvitationRepository extends JpaRepository<ProjectInvitation, UUID> {

    boolean existsByProjectIdAndInvitedUserIdAndStatus(
            UUID projectId,
            UUID invitedUserId,
            InvitationStatus status
    );

    List<ProjectInvitation> findAllByInvitedUserIdAndStatusOrderByCreatedAtDesc(
            UUID invitedUserId,
            InvitationStatus status
    );

    Optional<ProjectInvitation> findByIdAndProjectId(UUID id, UUID projectId);
}
