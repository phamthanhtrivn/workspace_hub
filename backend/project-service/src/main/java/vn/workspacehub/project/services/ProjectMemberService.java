package vn.workspacehub.project.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.project.dto.request.AddProjectMemberRequest;
import vn.workspacehub.project.dto.request.UpdateProjectMemberRoleRequest;
import vn.workspacehub.project.dto.response.ProjectMemberResponse;
import vn.workspacehub.project.entity.Project;
import vn.workspacehub.project.entity.ProjectMember;
import vn.workspacehub.project.enums.ProjectRole;
import vn.workspacehub.project.exception.BusinessException;
import vn.workspacehub.project.mapper.ProjectMemberMapper;
import vn.workspacehub.project.repository.ProjectMemberRepository;
import vn.workspacehub.project.repository.ProjectRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectMemberService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectMemberMapper projectMemberMapper;

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> findAll(UUID currentUserId, UUID projectId) {
        requireAccess(currentUserId, projectId);

        return projectMemberRepository.findAllByProjectIdOrderByJoinedAtAsc(projectId)
                .stream()
                .map(projectMemberMapper::toResponse)
                .toList();
    }

    @Transactional
    public ProjectMemberResponse add(
            UUID currentUserId,
            UUID projectId,
            AddProjectMemberRequest request
    ) {
        Project project = requireManager(currentUserId, projectId);

        if (request.userId().equals(project.getOwnerId())) {
            throw new BusinessException("Owner đã là thành viên của project");
        }

        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, request.userId())) {
            throw new BusinessException("User đã là thành viên của project");
        }

        ProjectMember member = ProjectMember.builder()
                .project(project)
                .userId(request.userId())
                .role(ProjectRole.MEMBER)
                .build();

        return projectMemberMapper.toResponse(projectMemberRepository.save(member));
    }

    @Transactional
    public ProjectMemberResponse updateRole(
            UUID currentUserId,
            UUID projectId,
            UUID memberUserId,
            UpdateProjectMemberRoleRequest request
    ) {
        requireOwner(currentUserId, projectId);

        if (request.role() == ProjectRole.OWNER) {
            throw new BusinessException("Không thể gán thêm vai trò OWNER");
        }

        ProjectMember member = getMember(projectId, memberUserId);
        if (member.getRole() == ProjectRole.OWNER) {
            throw new BusinessException("Không thể thay đổi vai trò của owner");
        }

        member.setRole(request.role());
        return projectMemberMapper.toResponse(projectMemberRepository.save(member));
    }

    @Transactional
    public void remove(UUID currentUserId, UUID projectId, UUID memberUserId) {
        requireManager(currentUserId, projectId);
        ProjectMember currentMember = getMember(projectId, currentUserId);

        ProjectMember target = getMember(projectId, memberUserId);
        if (target.getRole() == ProjectRole.OWNER) {
            throw new BusinessException("Không thể xoá owner khỏi project");
        }

        if (currentMember != null
                && currentMember.getRole() == ProjectRole.ADMIN
                && target.getRole() == ProjectRole.ADMIN) {
            throw new BusinessException("Admin không thể xoá admin khác");
        }

        projectMemberRepository.deleteByProjectIdAndUserId(projectId, memberUserId);
    }

    private Project requireAccess(UUID currentUserId, UUID projectId) {
        requireUserId(currentUserId);

        Project project = getProject(projectId);
        if (currentUserId.equals(project.getOwnerId())
                || projectMemberRepository.existsByProjectIdAndUserId(projectId, currentUserId)) {
            return project;
        }

        throw new BusinessException("Bạn không có quyền truy cập project này");
    }

    private Project requireManager(UUID currentUserId, UUID projectId) {
        Project project = requireAccess(currentUserId, projectId);
        if (currentUserId.equals(project.getOwnerId())) {
            return project;
        }

        ProjectMember member = getMember(projectId, currentUserId);
        if (member.getRole() != ProjectRole.ADMIN) {
            throw new BusinessException("Bạn không có quyền quản lý thành viên");
        }

        return project;
    }

    private void requireOwner(UUID currentUserId, UUID projectId) {
        Project project = requireAccess(currentUserId, projectId);
        if (!currentUserId.equals(project.getOwnerId())) {
            throw new BusinessException("Chỉ owner mới có quyền đổi vai trò");
        }
    }

    private ProjectMember getMember(UUID projectId, UUID userId) {
        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thành viên trong project"));
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
