package vn.workspacehub.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "pomodoro_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PomodoroConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id; // Using surrogate key

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "focus_duration")
    private int focusDuration;

    @Column(name = "short_break")
    private int shortBreak;

    @Column(name = "long_break")
    private int longBreak;

    @Column(name = "long_break_interval")
    private int longBreakInterval;

    @Column(name = "auto_start_break")
    private boolean autoStartBreak;

    @Column(name = "auto_start_focus")
    private boolean autoStartFocus;
}
