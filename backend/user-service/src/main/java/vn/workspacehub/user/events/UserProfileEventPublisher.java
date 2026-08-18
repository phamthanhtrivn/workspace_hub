package vn.workspacehub.user.events;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserProfileEventPublisher {

    private final KafkaTemplate<String, UserProfileSnapshotPayload> kafkaTemplate;

    public void publishSnapshotUpsertedAfterCommit(User user) {
        UserProfile profile = user.getProfile();
        UserProfileSnapshotPayload payload = UserProfileSnapshotPayload.builder()
                .eventType(UserProfileEventType.USER_PROFILE_SNAPSHOT_UPSERTED)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(profile != null ? profile.getFullName() : null)
                .avatarUrl(profile != null ? profile.getAvatarUrl() : null)
                .occurredAt(Instant.now())
                .build();

        publishAfterCommit(payload);
    }

    private void publishAfterCommit(UserProfileSnapshotPayload payload) {
        Runnable publish = () -> kafkaTemplate.send(
                UserProfileEventTopic.USER_PROFILE_EVENTS,
                payload.getUserId().toString(),
                payload
        ).whenComplete((result, error) -> {
            if (error != null) {
                log.error("Failed to publish user profile snapshot event for {}", payload.getUserId(), error);
            }
        });

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish.run();
                }
            });
            return;
        }

        publish.run();
    }
}
