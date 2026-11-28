package vn.workspacehub.user.events;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

class UserProfileOutboxReplayTest {
    private static final String CHECKPOINT_NAME = "profile-snapshot-v1";
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
    private final TransactionStatus transactionStatus = mock(TransactionStatus.class);
    private final UserEventOutbox outbox = mock(UserEventOutbox.class);
    private final UserProfileOutboxReplay replay = new UserProfileOutboxReplay(
            jdbc, new TransactionTemplate(transactionManager), outbox);
    private Map<String, Object> checkpoint;

    @BeforeEach
    void configureCheckpointStorage() {
        when(transactionManager.getTransaction(any(TransactionDefinition.class))).thenReturn(transactionStatus);
        when(jdbc.update(contains("INSERT INTO user_event_replay_checkpoint"), eq(CHECKPOINT_NAME)))
                .thenAnswer(invocation -> {
                    if (checkpoint != null) return 0;
                    checkpoint = new HashMap<>();
                    checkpoint.put("last_user_id", null);
                    checkpoint.put("completed", false);
                    return 1;
                });
        when(jdbc.queryForMap(anyString(), eq(CHECKPOINT_NAME))).thenAnswer(invocation -> {
            if (checkpoint == null) throw new EmptyResultDataAccessException(1);
            return checkpoint;
        });
    }

    @Test
    void recreatesMissingCheckpointAndCompletesAnEmptyReplay() {
        when(jdbc.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<UUID>>any(),
                isNull(), isNull())).thenReturn(List.of());

        assertDoesNotThrow(replay::replayBatch);

        var order = inOrder(jdbc, transactionManager);
        order.verify(jdbc).update(contains("ON CONFLICT (name) DO NOTHING"), eq(CHECKPOINT_NAME));
        order.verify(jdbc).queryForMap(contains("FOR UPDATE"), eq(CHECKPOINT_NAME));
        order.verify(jdbc).update(contains("SET completed = true"), eq(CHECKPOINT_NAME));
        order.verify(transactionManager).commit(transactionStatus);
        verifyNoInteractions(outbox);
    }

    @Test
    void resumesFromExistingCursorAndAdvancesAfterEnqueueingTheBatch() {
        UUID cursor = UUID.randomUUID();
        UUID firstUser = UUID.randomUUID();
        UUID lastUser = UUID.randomUUID();
        checkpoint = Map.of("last_user_id", cursor, "completed", false);
        when(jdbc.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<UUID>>any(),
                eq(cursor), eq(cursor))).thenReturn(List.of(firstUser, lastUser));

        replay.replayBatch();

        var order = inOrder(jdbc, outbox, transactionManager);
        order.verify(jdbc).query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<UUID>>any(),
                eq(cursor), eq(cursor));
        order.verify(outbox).enqueue(UserProfileEventTopic.USER_PROFILE_EVENTS, firstUser, Map.of());
        order.verify(outbox).enqueue(UserProfileEventTopic.USER_PROFILE_EVENTS, lastUser, Map.of());
        order.verify(jdbc).update(contains("SET last_user_id = ?"), eq(lastUser), eq(CHECKPOINT_NAME));
        order.verify(transactionManager).commit(transactionStatus);
        assertEquals(cursor, checkpoint.get("last_user_id"));
    }

    @Test
    void leavesCompletedReplayAlone() {
        checkpoint = Map.of("completed", true);

        replay.replayBatch();

        verify(jdbc, never()).query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<UUID>>any(),
                nullable(UUID.class), nullable(UUID.class));
        verify(jdbc, never()).update(contains("SET completed"), eq(CHECKPOINT_NAME));
        verifyNoInteractions(outbox);
        verify(transactionManager).commit(transactionStatus);
    }

    @Test
    void rollsBackWithoutAdvancingCheckpointWhenEnqueueFails() {
        UUID cursor = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        checkpoint = Map.of("last_user_id", cursor, "completed", false);
        when(jdbc.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<UUID>>any(),
                eq(cursor), eq(cursor))).thenReturn(List.of(userId));
        doThrow(new IllegalStateException("Outbox write failed"))
                .when(outbox).enqueue(UserProfileEventTopic.USER_PROFILE_EVENTS, userId, Map.of());

        assertThrows(IllegalStateException.class, replay::replayBatch);

        verify(jdbc, never()).update(contains("SET last_user_id"), any(), any());
        verify(transactionManager).rollback(transactionStatus);
        verify(transactionManager, never()).commit(any());
    }
}
