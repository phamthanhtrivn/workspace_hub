package vn.workspacehub.user.events;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
@RequiredArgsConstructor
public class UserEventOutbox {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    @PersistenceContext private EntityManager entities;

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueue(String topic, UUID userId, Object payload) {
        // Materialize a new user and serialize writers for this aggregate before
        // allocating its revision. The insert shares the business transaction.
        entities.flush();
        jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", UUID.class, userId);
        long revision = jdbc.queryForObject("SELECT nextval('user_event_revision')", Long.class);
        UUID eventId = UUID.randomUUID();
        ObjectNode envelope;
        if (UserProfileEventTopic.USER_PROFILE_EVENTS.equals(topic)) {
            // Re-read after the aggregate lock. A snapshot assembled before
            // waiting for another writer can otherwise overwrite newer fields.
            String snapshot = jdbc.queryForObject("""
                    SELECT jsonb_build_object(
                      'eventType', CASE WHEN u.status = 'ACTIVE' THEN 'USER_PROFILE_SNAPSHOT_UPSERTED' ELSE 'USER_PROFILE_SNAPSHOT_DISABLED' END,
                      'userId', u.id, 'email', u.email, 'fullName', p.full_name, 'avatarUrl', p.avatar_url)::text
                    FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?
                    """, String.class, userId);
            envelope = (ObjectNode) mapper.readTree(snapshot);
        } else {
            envelope = (ObjectNode) mapper.valueToTree(payload);
        }
        envelope.put("eventId", eventId.toString());
        envelope.put("schemaVersion", 1);
        envelope.put("revision", Long.toString(revision));
        envelope.put("occurredAt", Instant.now().toString());
        jdbc.update("""
                INSERT INTO user_event_outbox (id, aggregate_id, revision, topic, payload)
                VALUES (?, ?, ?, ?, ?::jsonb)
                """, eventId, userId, revision, topic, mapper.writeValueAsString(envelope));
    }
}
