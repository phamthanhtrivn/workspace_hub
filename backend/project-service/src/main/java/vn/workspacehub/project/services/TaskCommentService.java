package vn.workspacehub.project.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.project.dto.request.CreateTaskCommentRequest;
import vn.workspacehub.project.dto.request.UpdateTaskCommentRequest;
import vn.workspacehub.project.dto.response.TaskCommentResponse;
import vn.workspacehub.project.entity.Project;
import vn.workspacehub.project.entity.ProjectMember;
import vn.workspacehub.project.entity.Task;
import vn.workspacehub.project.entity.TaskComment;
import vn.workspacehub.project.enums.ProjectRole;
import vn.workspacehub.project.exception.BusinessException;
import vn.workspacehub.project.mapper.TaskCommentMapper;
import vn.workspacehub.project.repository.ProjectMemberRepository;
import vn.workspacehub.project.repository.TaskCommentRepository;
import vn.workspacehub.project.repository.TaskRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskCommentService {

    private final TaskCommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskCommentMapper commentMapper;

    @Transactional(readOnly = true)
    public List<TaskCommentResponse> findAll(UUID currentUserId, UUID taskId) {
        Task task = getTask(taskId);
        requireProjectAccess(currentUserId, task.getProject());

        return commentRepository.findAllByTaskIdOrderByCreatedAtAsc(taskId)
                .stream()
                .map(commentMapper::toResponse)
                .toList();
    }

    @Transactional
    public TaskCommentResponse create(
            UUID currentUserId,
            UUID taskId,
            CreateTaskCommentRequest request
    ) {
        Task task = getTask(taskId);
        requireProjectAccess(currentUserId, task.getProject());

        TaskComment comment = TaskComment.builder()
                .task(task)
                .authorId(currentUserId)
                .content(request.content().trim())
                .edited(false)
                .build();

        return commentMapper.toResponse(commentRepository.save(comment));
    }

    @Transactional
    public TaskCommentResponse update(
            UUID currentUserId,
            UUID commentId,
            UpdateTaskCommentRequest request
    ) {
        TaskComment comment = getComment(commentId);
        requireCanManageComment(currentUserId, comment);

        comment.setContent(request.content().trim());
        comment.setEdited(true);
        return commentMapper.toResponse(commentRepository.save(comment));
    }

    @Transactional
    public void delete(UUID currentUserId, UUID commentId) {
        TaskComment comment = getComment(commentId);
        requireCanManageComment(currentUserId, comment);
        commentRepository.delete(comment);
    }

    private void requireCanManageComment(UUID currentUserId, TaskComment comment) {
        Project project = comment.getTask().getProject();
        requireProjectAccess(currentUserId, project);

        boolean isAuthor = currentUserId.equals(comment.getAuthorId());
        boolean isOwner = currentUserId.equals(project.getOwnerId());
        boolean isAdmin = projectMemberRepository
                .findByProjectIdAndUserId(project.getId(), currentUserId)
                .map(member -> member.getRole() == ProjectRole.ADMIN
                        || member.getRole() == ProjectRole.OWNER)
                .orElse(false);

        if (!isAuthor && !isOwner && !isAdmin) {
            throw new BusinessException("Bạn không có quyền chỉnh sửa comment này");
        }
    }

    private void requireProjectAccess(UUID currentUserId, Project project) {
        if (currentUserId == null) {
            throw new BusinessException("Thiếu thông tin người dùng hiện tại");
        }

        boolean isOwner = currentUserId.equals(project.getOwnerId());
        boolean isMember = projectMemberRepository
                .existsByProjectIdAndUserId(project.getId(), currentUserId);

        if (!isOwner && !isMember) {
            throw new BusinessException("Bạn không có quyền truy cập task này");
        }
    }

    private Task getTask(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy task"));
    }

    private TaskComment getComment(UUID commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy comment"));
    }
}
