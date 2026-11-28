package vn.workspacehub.user.service;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionRevocationPublisher {
    private static final String CHANNEL = "workspacehub:session-revoked";
    private final StringRedisTemplate redis;

    public void revoked(UUID userId, UUID sessionId) {
        Runnable publish = () -> {
            String message = "{\"userId\":\"" + userId + "\",\"sessionId\":" + (sessionId == null ? "null" : "\"" + sessionId + "\"") + "}";
            try { redis.convertAndSend(CHANNEL, message); }
            catch (RuntimeException failure) { log.warn("Session revocation delivery unavailable; authorization checks remain enforced"); }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { publish.run(); }
            });
        } else publish.run();
    }
}
