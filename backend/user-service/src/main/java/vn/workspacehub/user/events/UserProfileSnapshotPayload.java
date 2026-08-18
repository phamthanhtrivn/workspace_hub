package vn.workspacehub.user.events;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class UserProfileSnapshotPayload {
    private UserProfileEventType eventType;
    private UUID userId;
    private String email;
    private String fullName;
    private String avatarUrl;
    private Instant occurredAt;
}
