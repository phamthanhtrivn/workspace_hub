package vn.workspacehub.project.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import vn.workspacehub.project.enums.InvitationStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "project_invitations",
        indexes = {
                @Index(name = "idx_project_invitation_invited_user", columnList = "invited_user_id"),
                @Index(name = "idx_project_invitation_project", columnList = "project_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "invited_user_id", nullable = false)
    private UUID invitedUserId;

    @Column(name = "invited_by", nullable = false)
    private UUID invitedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}
