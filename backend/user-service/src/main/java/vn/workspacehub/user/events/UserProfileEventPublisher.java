package vn.workspacehub.user.events;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserProfileEventPublisher {

    private final UserEventOutbox outbox;

    public void enqueueSnapshot(User user) {
        UserProfile profile = user.getProfile();
        UserProfileSnapshotPayload payload = UserProfileSnapshotPayload.builder()
                .eventType(UserProfileEventType.USER_PROFILE_SNAPSHOT_UPSERTED)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(profile != null ? profile.getFullName() : null)
                .avatarUrl(profile != null ? profile.getAvatarUrl() : null)
                .occurredAt(Instant.now())
                .build();

        outbox.enqueue(UserProfileEventTopic.USER_PROFILE_EVENTS, user.getId(), payload);
    }
}
