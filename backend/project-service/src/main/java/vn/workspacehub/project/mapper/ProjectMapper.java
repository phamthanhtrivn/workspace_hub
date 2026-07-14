package vn.workspacehub.project.mapper;

import org.springframework.stereotype.Component;
import vn.workspacehub.project.dto.response.ProjectResponse;
import vn.workspacehub.project.entity.Project;

@Component
public class ProjectMapper {

    public ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getColor(),
                project.getIcon(),
                project.getOwnerId(),
                project.getStatus(),
                project.isArchived(),
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }
}
