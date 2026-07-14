package vn.workspacehub.project.mapper;

import org.springframework.stereotype.Component;
import vn.workspacehub.project.dto.response.ProjectMemberResponse;
import vn.workspacehub.project.entity.ProjectMember;

@Component
public class ProjectMemberMapper {

    public ProjectMemberResponse toResponse(ProjectMember member) {
        return new ProjectMemberResponse(
                member.getId(),
                member.getUserId(),
                member.getRole(),
                member.getJoinedAt()
        );
    }
}
