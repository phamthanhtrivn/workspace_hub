package vn.workspacehub.user.events;

import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserEventOutboxRelay {
    private static final int BATCH_SIZE = 10;
    private static final int LEASE_SECONDS = 120;
    private final JdbcTemplate jdbc;
    private final KafkaTemplate<String, String> userOutboxKafkaTemplate;
    private volatile boolean stopping;
    record Event(UUID id, UUID userId, String topic, String payload, int attempts) {}

    @PreDestroy
    public void stop() { stopping = true; }

    @Scheduled(fixedDelay = 2000)
    public void drain() {
        if (stopping) return;
        UUID token = UUID.randomUUID();
        List<Event> events = jdbc.query("""
                WITH candidates AS (
                    SELECT e.id FROM user_event_outbox e
                    WHERE e.delivered_at IS NULL AND e.next_attempt_at <= now()
                      AND (e.lease_until IS NULL OR e.lease_until <= now())
                      AND NOT EXISTS (
                        SELECT 1 FROM user_event_outbox older
                        WHERE older.aggregate_id = e.aggregate_id
                          AND older.revision < e.revision AND older.delivered_at IS NULL
                      )
                    ORDER BY e.revision LIMIT ? FOR UPDATE OF e SKIP LOCKED
                )
                UPDATE user_event_outbox e SET lease_token = ?, lease_until = now() + (? * interval '1 second')
                FROM candidates c WHERE e.id = c.id
                RETURNING e.id, e.aggregate_id, e.topic, e.payload::text, e.attempt_count
                """, (rs, index) -> new Event(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                        rs.getString(3), rs.getString(4), rs.getInt(5)), BATCH_SIZE, token, LEASE_SECONDS);
        for (Event event : events) {
            if (stopping) {
                release(event, token);
                continue;
            }
            try {
                // No database transaction is held while waiting for the broker.
                userOutboxKafkaTemplate.send(event.topic(), event.userId().toString(), event.payload()).get(10, TimeUnit.SECONDS);
                jdbc.update("""
                        UPDATE user_event_outbox SET delivered_at = now(), lease_token = NULL, lease_until = NULL
                        WHERE id = ? AND lease_token = ? AND lease_until > now() AND delivered_at IS NULL
                        """, event.id(), token);
            } catch (Exception unavailable) {
                if (unavailable instanceof InterruptedException) Thread.currentThread().interrupt();
                long delay = Math.min(60000, 2000L << Math.min(event.attempts(), 5));
                jdbc.update("""
                        UPDATE user_event_outbox SET attempt_count = attempt_count + 1,
                          next_attempt_at = now() + (? * interval '1 millisecond'), lease_token = NULL, lease_until = NULL
                        WHERE id = ? AND lease_token = ? AND lease_until > now() AND delivered_at IS NULL
                        """, delay, event.id(), token);
                log.warn("User event delivery will retry: {}", event.id());
            }
        }
    }

    private void release(Event event, UUID token) {
        jdbc.update("UPDATE user_event_outbox SET lease_token = NULL, lease_until = NULL WHERE id = ? AND lease_token = ?", event.id(), token);
    }
}
