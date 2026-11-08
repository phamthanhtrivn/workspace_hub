package vn.workspacehub.user.events;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/** One bounded, resumable replay of existing profiles after the outbox migration. */
@Component
@RequiredArgsConstructor
public class UserProfileOutboxReplay {
    private static final String CHECKPOINT_NAME = "profile-snapshot-v1";
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final UserEventOutbox outbox;

    @Scheduled(fixedDelay = 5000, initialDelay = 5000)
    public void replayBatch() {
        transactions.executeWithoutResult(status -> {
            // Restore a missing seed without resetting an existing replay's progress.
            jdbc.update("""
                    INSERT INTO user_event_replay_checkpoint (name) VALUES (?)
                    ON CONFLICT (name) DO NOTHING
                    """, CHECKPOINT_NAME);
            var checkpoint = jdbc.queryForMap(
                    "SELECT last_user_id, completed FROM user_event_replay_checkpoint WHERE name = ? FOR UPDATE",
                    CHECKPOINT_NAME);
            if (Boolean.TRUE.equals(checkpoint.get("completed"))) return;
            UUID cursor = (UUID) checkpoint.get("last_user_id");
            List<UUID> profiles = jdbc.query("""
                    SELECT u.id FROM users u
                    WHERE (?::uuid IS NULL OR u.id > ?::uuid) ORDER BY u.id LIMIT 50 FOR UPDATE OF u
                    """, (rs, index) -> rs.getObject(1, UUID.class), cursor, cursor);
            for (UUID userId : profiles) {
                outbox.enqueue(UserProfileEventTopic.USER_PROFILE_EVENTS, userId, Map.of());
            }
            if (profiles.isEmpty()) jdbc.update("UPDATE user_event_replay_checkpoint SET completed = true WHERE name = ?", CHECKPOINT_NAME);
            else jdbc.update("UPDATE user_event_replay_checkpoint SET last_user_id = ? WHERE name = ?", profiles.getLast(), CHECKPOINT_NAME);
        });
    }
}
