package vn.workspacehub.project.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.project.dto.request.CreateProjectRequest;
import vn.workspacehub.project.dto.request.UpdateProjectRequest;
import vn.workspacehub.project.dto.response.ProjectResponse;
import vn.workspacehub.project.entity.Project;
import vn.workspacehub.project.entity.ProjectMember;
import vn.workspacehub.project.entity.ProjectSetting;
import vn.workspacehub.project.enums.ProjectRole;
import vn.workspacehub.project.enums.ProjectStatus;
import vn.workspacehub.project.exception.BusinessException;
import vn.workspacehub.project.mapper.ProjectMapper;
import vn.workspacehub.project.repository.ProjectMemberRepository;
import vn.workspacehub.project.repository.ProjectRepository;
import vn.workspacehub.project.repository.ProjectSettingRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectSettingRepository projectSettingRepository;
    private final ProjectMapper projectMapper;

    @Transactional
    public ProjectResponse create(UUID currentUserId, CreateProjectRequest request) {
        requireUserId(currentUserId);

        Project project = Project.builder()
                .name(request.name().trim())
                .color(request.color())
                .icon(request.icon())
                .ownerId(currentUserId)
                .status(ProjectStatus.ACTIVE)
                .archived(false)
                .build();

        project = projectRepository.save(project);

        ProjectMember owner = ProjectMember.builder()
                .project(project)
                .userId(currentUserId)
                .role(ProjectRole.OWNER)
                .build();

        ProjectSetting setting = ProjectSetting.builder()
                .project(project)
                .allowMemberCreateTask(true)
                .allowMemberEditOthersTask(false)
                .allowMemberEditOwnTask(true)
                .allowMemberInvite(false)
                .build();

        projectMemberRepository.save(owner);
        projectSettingRepository.save(setting);

        return projectMapper.toResponse(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> findAllForUser(UUID currentUserId) {
        requireUserId(currentUserId);

        return projectRepository
                .findDistinctByOwnerIdOrMembersUserId(currentUserId, currentUserId)
                .stream()
                .filter(project -> !project.isArchived())
                .map(projectMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse findByIdForUser(UUID currentUserId, UUID projectId) {
        requireUserId(currentUserId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy project"));

        boolean isOwner = currentUserId.equals(project.getOwnerId());
        boolean isMember = projectMemberRepository
                .existsByProjectIdAndUserId(projectId, currentUserId);

        if (!isOwner && !isMember) {
            throw new BusinessException("Bạn không có quyền truy cập project này");
        }

        return projectMapper.toResponse(project);
    }

    @Transactional
    public ProjectResponse update(
            UUID currentUserId,
            UUID projectId,
            UpdateProjectRequest request
    ) {
        Project project = requireManagerProject(currentUserId, projectId);

        if (request.name() != null) {
            String name = request.name().trim();
            if (name.isBlank()) {
                throw new BusinessException("Tên project không được để trống");
            }
            project.setName(name);
        }
        if (request.color() != null) {
            project.setColor(request.color());
        }
        if (request.icon() != null) {
            project.setIcon(request.icon());
        }
        if (request.status() != null) {
            project.setStatus(request.status());
            project.setArchived(request.status() == ProjectStatus.ARCHIVED);
        }

        return projectMapper.toResponse(projectRepository.save(project));
    }

    @Transactional
    public void archive(UUID currentUserId, UUID projectId) {
        Project project = requireManagerProject(currentUserId, projectId);
        project.setArchived(true);
        project.setStatus(ProjectStatus.ARCHIVED);
        projectRepository.save(project);
    }

    private Project requireManagerProject(UUID currentUserId, UUID projectId) {
        requireUserId(currentUserId);

        Project project = getProject(projectId);
        if (currentUserId.equals(project.getOwnerId())) {
            return project;
        }

        ProjectMember member = projectMemberRepository
                .findByProjectIdAndUserId(projectId, currentUserId)
                .orElseThrow(() -> new BusinessException("Bạn không có quyền truy cập project này"));

        if (member.getRole() != ProjectRole.ADMIN) {
            throw new BusinessException("Bạn không có quyền quản lý project này");
        }

        return project;
    }

    private Project getProject(UUID projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy project"));
    }

    private void requireUserId(UUID currentUserId) {
        if (currentUserId == null) {
            throw new BusinessException("Thiếu thông tin người dùng hiện tại");
        }
    }
}
