package vn.workspacehub.project.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.project.dto.request.CreateTaskRequest;
import vn.workspacehub.project.dto.request.UpdateTaskRequest;
import vn.workspacehub.project.dto.response.TaskResponse;
import vn.workspacehub.project.entity.Project;
import vn.workspacehub.project.entity.ProjectMember;
import vn.workspacehub.project.entity.ProjectSetting;
import vn.workspacehub.project.entity.Task;
import vn.workspacehub.project.enums.ProjectRole;
import vn.workspacehub.project.enums.TaskPriority;
import vn.workspacehub.project.enums.TaskStatus;
import vn.workspacehub.project.exception.BusinessException;
import vn.workspacehub.project.mapper.TaskMapper;
import vn.workspacehub.project.repository.ProjectMemberRepository;
import vn.workspacehub.project.repository.ProjectRepository;
import vn.workspacehub.project.repository.TaskRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskMapper taskMapper;

    @Transactional
    public TaskResponse create(
            UUID currentUserId,
            UUID projectId,
            CreateTaskRequest request
    ) {
        Project project = requireCanCreate(currentUserId, projectId);

        Task task = Task.builder()
                .project(project)
                .parent(resolveParent(project, parseParentId(request.parentTaskId())))
                .title(request.title().trim())
                .description(request.description())
                .priority(request.priority() == null ? TaskPriority.MEDIUM : request.priority())
                .status(request.status() == null ? TaskStatus.TODO : request.status())
                .createdBy(currentUserId)
                .reporterId(currentUserId)
                .startDate(request.startDate())
                .dueDate(request.dueDate())
                .allDay(Boolean.TRUE.equals(request.allDay()))
                .estimatedMinutes(request.estimatedMinutes() == null ? 0 : request.estimatedMinutes())
                .rank(request.rank())
                .archived(false)
                .parentTask(Boolean.TRUE.equals(request.isParentTask()))
                .autoCompleteSprint(Boolean.TRUE.equals(request.autoCompleteSprint()))
                .build();

        return taskMapper.toResponse(taskRepository.save(task));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> findAllByProject(
            UUID currentUserId,
            UUID projectId
    ) {
        requireProjectAccess(currentUserId, projectId);

        return taskRepository
                .findAllByProjectIdAndArchivedFalseOrderByRankAscCreatedAtAsc(projectId)
                .stream()
                .map(taskMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse findById(UUID currentUserId, UUID taskId) {
        Task task = getTask(taskId);
        requireProjectAccess(currentUserId, task.getProject().getId());
        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse update(
            UUID currentUserId,
            UUID taskId,
            UpdateTaskRequest request
    ) {
        Task task = getTask(taskId);
        Project project = task.getProject();
        requireCanEdit(currentUserId, project, task);

        if (request.title() != null) {
            String title = request.title().trim();
            if (title.isBlank()) {
                throw new BusinessException("Tiêu đề task không được để trống");
            }
            task.setTitle(title);
        }
        if (request.description() != null) task.setDescription(request.description());
        if (request.priority() != null) task.setPriority(request.priority());
        if (request.startDate() != null) task.setStartDate(request.startDate());
        if (request.dueDate() != null) task.setDueDate(request.dueDate());
        if (request.allDay() != null) task.setAllDay(request.allDay());
        if (request.estimatedMinutes() != null) task.setEstimatedMinutes(request.estimatedMinutes());
        if (request.rank() != null) task.setRank(request.rank());
        if (request.archived() != null) task.setArchived(request.archived());
        if (request.isParentTask() != null) task.setParentTask(request.isParentTask());
        if (request.autoCompleteSprint() != null) task.setAutoCompleteSprint(request.autoCompleteSprint());

        if (Boolean.TRUE.equals(request.clearParent())
                && request.parentTaskId() != null
                && !request.parentTaskId().isBlank()) {
            throw new BusinessException("Không thể vừa gán vừa xóa task cha");
        }
        if (Boolean.TRUE.equals(request.clearParent())) {
            task.setParent(null);
        } else if (request.parentTaskId() != null && !request.parentTaskId().isBlank()) {
            UUID parentTaskId = parseParentId(request.parentTaskId());
            if (parentTaskId.equals(task.getId())) {
                throw new BusinessException("Task không thể là task cha của chính nó");
            }
            task.setParent(resolveParent(project, parentTaskId));
        }

        if (request.status() != null) {
            task.setStatus(request.status());
            task.setCompletedAt(
                    request.status() == TaskStatus.DONE ? LocalDateTime.now() : null
            );
        }

        return taskMapper.toResponse(taskRepository.save(task));
    }

    private Task resolveParent(Project project, UUID parentTaskId) {
        if (parentTaskId == null) {
            return null;
        }

        Task parent = taskRepository.findByIdAndProjectId(parentTaskId, project.getId())
                .orElseThrow(() -> new BusinessException("Task cha không tồn tại trong project này"));

        if (parent.isArchived()) {
            throw new BusinessException("Không thể chọn task đã lưu trữ làm task cha");
        }
        if (parent.getParent() != null) {
            throw new BusinessException("Chỉ task lớn mới có thể làm task cha");
        }

        return parent;
    }

    private UUID parseParentId(String parentTaskId) {
        if (parentTaskId == null || parentTaskId.isBlank()) {
            return null;
        }

        try {
            return UUID.fromString(parentTaskId.trim());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("parentTaskId không đúng định dạng UUID");
        }
    }

    private Project requireCanCreate(UUID currentUserId, UUID projectId) {
        Project project = requireProjectAccess(currentUserId, projectId);

        if (currentUserId.equals(project.getOwnerId())) {
            return project;
        }

        ProjectMember member = getMember(projectId, currentUserId);

        if (member.getRole() == ProjectRole.OWNER || member.getRole() == ProjectRole.ADMIN) {
            return project;
        }

        ProjectSetting setting = project.getProjectSetting();
        if (setting == null || !setting.isAllowMemberCreateTask()) {
            throw new BusinessException("Bạn không có quyền tạo task trong project này");
        }

        return project;
    }

    private void requireCanEdit(UUID currentUserId, Project project, Task task) {
        requireUserId(currentUserId);

        if (currentUserId.equals(project.getOwnerId())) {
            return;
        }

        ProjectMember member = getMember(project.getId(), currentUserId);
        if (member.getRole() == ProjectRole.OWNER || member.getRole() == ProjectRole.ADMIN) {
            return;
        }

        ProjectSetting setting = project.getProjectSetting();
        boolean isOwnTask = currentUserId.equals(task.getCreatedBy());
        boolean canEdit = setting != null
                && (isOwnTask
                ? setting.isAllowMemberEditOwnTask()
                : setting.isAllowMemberEditOthersTask());

        if (!canEdit) {
            throw new BusinessException("Bạn không có quyền sửa task này");
        }
    }

    private Project requireProjectAccess(UUID currentUserId, UUID projectId) {
        requireUserId(currentUserId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy project"));

        boolean isOwner = currentUserId.equals(project.getOwnerId());
        boolean isMember = projectMemberRepository
                .existsByProjectIdAndUserId(projectId, currentUserId);

        if (!isOwner && !isMember) {
            throw new BusinessException("Bạn không phải thành viên của project này");
        }

        return project;
    }

    private ProjectMember getMember(UUID projectId, UUID userId) {
        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new BusinessException("Bạn không phải thành viên của project này"));
    }

    private Task getTask(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy task"));
    }

    private void requireUserId(UUID currentUserId) {
        if (currentUserId == null) {
            throw new BusinessException("Thiếu thông tin người dùng hiện tại");
        }
    }
}
