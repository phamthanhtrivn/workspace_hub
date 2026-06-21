package vn.workspacehub.project.entity;

import jakarta.persistence.*;
import lombok.*;
import vn.workspacehub.project.enums.SessionStatus;
import vn.workspacehub.project.enums.SessionType;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pomodoro_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PomodoroSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_type")
    private SessionType sessionType;

    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;
}
