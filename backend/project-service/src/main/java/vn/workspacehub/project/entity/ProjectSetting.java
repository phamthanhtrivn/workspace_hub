package vn.workspacehub.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "project_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    private Project project;

    @Column(name = "allow_member_create_task")
    private boolean allowMemberCreateTask;

    @Column(name = "allow_member_edit_others_task")
    private boolean allowMemberEditOthersTask;

    @Column(name = "allow_member_edit_own_task")
    private boolean allowMemberEditOwnTask;

    @Column(name = "allow_member_invite")
    private boolean allowMemberInvite;
}
