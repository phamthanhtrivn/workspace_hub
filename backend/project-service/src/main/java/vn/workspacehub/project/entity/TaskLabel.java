package vn.workspacehub.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "task_labels")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"labelMappings"})
public class TaskLabel {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    private String name;
    private String color;

    @OneToMany(mappedBy = "label", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TaskLabelMapping> labelMappings;
}
