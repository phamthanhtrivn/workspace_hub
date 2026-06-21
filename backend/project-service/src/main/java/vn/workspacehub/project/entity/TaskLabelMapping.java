package vn.workspacehub.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "task_label_mappings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskLabelMapping {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne
    @JoinColumn(name = "label_id", nullable = false)
    private TaskLabel label;
}
