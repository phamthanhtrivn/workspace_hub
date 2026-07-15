package vn.workspacehub.project.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.project.clients.NotificationEmailClient;
import vn.workspacehub.project.clients.UserServiceClient;
import vn.workspacehub.project.dto.request.CreateProjectInvitationRequest;
import vn.workspacehub.project.dto.response.ProjectInvitationResponse;
import vn.workspacehub.project.entity.Project;
import vn.workspacehub.project.entity.ProjectInvitation;
import vn.workspacehub.project.entity.ProjectMember;
import vn.workspacehub.project.enums.InvitationStatus;
import vn.workspacehub.project.enums.ProjectRole;
import vn.workspacehub.project.exception.BusinessException;
import vn.workspacehub.project.mapper.ProjectInvitationMapper;
import vn.workspacehub.project.repository.ProjectInvitationRepository;
import vn.workspacehub.project.repository.ProjectMemberRepository;
import vn.workspacehub.project.repository.ProjectRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectInvitationService {

    private static final int INVITATION_EXPIRY_DAYS = 7;

    private final ProjectInvitationRepository invitationRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectInvitationMapper invitationMapper;
    private final UserServiceClient userServiceClient;
    private final NotificationEmailClient notificationEmailClient;

    @Transactional
    public ProjectInvitationResponse create(
            UUID currentUserId,
            UUID projectId,
            CreateProjectInvitationRequest request
    ) {
        Project project = requireCanInvite(currentUserId, projectId);
        UUID invitedUserId = request.invitedUserId();

        if (currentUserId.equals(invitedUserId)) {
            throw new BusinessException("Không thể tự gửi lời mời cho chính mình");
        }

        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, invitedUserId)) {
            throw new BusinessException("User đã là thành viên của project");
        }

        if (invitationRepository.existsByProjectIdAndInvitedUserIdAndStatus(
                projectId,
                invitedUserId,
                InvitationStatus.PENDING
        )) {
            throw new BusinessException("Lời mời đến user này đang chờ phản hồi");
        }

        ProjectInvitation invitation = ProjectInvitation.builder()
                .project(project)
                .invitedUserId(invitedUserId)
                .invitedBy(currentUserId)
                .status(InvitationStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusDays(INVITATION_EXPIRY_DAYS))
                .build();

        ProjectInvitation savedInvitation = invitationRepository.save(invitation);
        sendInvitationEmailSafely(savedInvitation, project, currentUserId, invitedUserId);

        return invitationMapper.toResponse(savedInvitation);
    }

    private void sendInvitationEmailSafely(
            ProjectInvitation invitation,
            Project project,
            UUID inviterId,
            UUID recipientId
    ) {
        try {
            UserServiceClient.UserContact recipient = userServiceClient.getContact(recipientId);
            UserServiceClient.UserContact inviter = userServiceClient.getContact(inviterId);
            notificationEmailClient.sendProjectInvitationEmail(
                    invitation,
                    project,
                    recipient,
                    inviter
            );
        } catch (Exception exception) {
            log.error(
                    "Project invitation {} was created, but its email could not be sent",
                    invitation.getId(),
                    exception
            );
        }
    }

    @Transactional
    public List<ProjectInvitationResponse> findPending(UUID currentUserId) {
        requireUserId(currentUserId);
        LocalDateTime now = LocalDateTime.now();

        return invitationRepository
                .findAllByInvitedUserIdAndStatusOrderByCreatedAtDesc(
                        currentUserId,
                        InvitationStatus.PENDING
                )
                .stream()
                .filter(invitation -> {
                    if (invitation.getExpiresAt() != null
                            && invitation.getExpiresAt().isBefore(now)) {
                        invitation.setStatus(InvitationStatus.EXPIRED);
                        invitation.setRespondedAt(now);
                        invitationRepository.save(invitation);
                        return false;
                    }
                    return true;
                })
                .map(invitationMapper::toResponse)
                .toList();
    }

    @Transactional
    public ProjectInvitationResponse accept(UUID currentUserId, UUID invitationId) {
        ProjectInvitation invitation = requireInvitation(invitationId);
        requireInvitee(currentUserId, invitation);
        ensurePending(invitation);

        if (projectMemberRepository.existsByProjectIdAndUserId(
                invitation.getProject().getId(),
                currentUserId
        )) {
            throw new BusinessException("Bạn đã là thành viên của project");
        }

        ProjectMember member = ProjectMember.builder()
                .project(invitation.getProject())
                .userId(currentUserId)
                .role(ProjectRole.MEMBER)
                .build();
        projectMemberRepository.save(member);

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setRespondedAt(LocalDateTime.now());
        return invitationMapper.toResponse(invitationRepository.save(invitation));
    }

    @Transactional
    public ProjectInvitationResponse decline(UUID currentUserId, UUID invitationId) {
        ProjectInvitation invitation = requireInvitation(invitationId);
        requireInvitee(currentUserId, invitation);
        ensurePending(invitation);

        invitation.setStatus(InvitationStatus.DECLINED);
        invitation.setRespondedAt(LocalDateTime.now());
        return invitationMapper.toResponse(invitationRepository.save(invitation));
    }

    @Transactional
    public void cancel(UUID currentUserId, UUID projectId, UUID invitationId) {
        requireCanInvite(currentUserId, projectId);
        ProjectInvitation invitation = invitationRepository
                .findByIdAndProjectId(invitationId, projectId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lời mời"));

        ensurePending(invitation);
        invitation.setStatus(InvitationStatus.CANCELLED);
        invitation.setRespondedAt(LocalDateTime.now());
        invitationRepository.save(invitation);
    }

    private Project requireCanInvite(UUID currentUserId, UUID projectId) {
        requireUserId(currentUserId);
        Project project = getProject(projectId);

        if (currentUserId.equals(project.getOwnerId())) {
            return project;
        }

        ProjectMember member = projectMemberRepository
                .findByProjectIdAndUserId(projectId, currentUserId)
                .orElseThrow(() -> new BusinessException("Bạn không phải thành viên của project"));

        if (member.getRole() == ProjectRole.ADMIN) {
            return project;
        }

        if (project.getProjectSetting() != null
                && project.getProjectSetting().isAllowMemberInvite()) {
            return project;
        }

        throw new BusinessException("Bạn không có quyền mời thành viên");
    }

    private ProjectInvitation requireInvitation(UUID invitationId) {
        return invitationRepository.findById(invitationId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lời mời"));
    }

    private void requireInvitee(UUID currentUserId, ProjectInvitation invitation) {
        requireUserId(currentUserId);
        if (!currentUserId.equals(invitation.getInvitedUserId())) {
            throw new BusinessException("Bạn không có quyền xử lý lời mời này");
        }
    }

    private void ensurePending(ProjectInvitation invitation) {
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new BusinessException("Lời mời này đã được xử lý");
        }

        if (invitation.getExpiresAt() != null
                && invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitation.setRespondedAt(LocalDateTime.now());
            invitationRepository.save(invitation);
            throw new BusinessException("Lời mời đã hết hạn");
        }
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
