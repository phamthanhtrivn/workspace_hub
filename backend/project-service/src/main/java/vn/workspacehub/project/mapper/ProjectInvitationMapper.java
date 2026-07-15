package vn.workspacehub.project.mapper;

import org.springframework.stereotype.Component;
import vn.workspacehub.project.dto.response.ProjectInvitationResponse;
import vn.workspacehub.project.entity.ProjectInvitation;

@Component
public class ProjectInvitationMapper {

    public ProjectInvitationResponse toResponse(ProjectInvitation invitation) {
        return new ProjectInvitationResponse(
                invitation.getId(),
                invitation.getProject().getId(),
                invitation.getProject().getName(),
                invitation.getInvitedUserId(),
                invitation.getInvitedBy(),
                invitation.getStatus(),
                invitation.getCreatedAt(),
                invitation.getRespondedAt(),
                invitation.getExpiresAt()
        );
    }
}
