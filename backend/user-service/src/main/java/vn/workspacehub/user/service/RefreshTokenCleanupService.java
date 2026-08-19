package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.repository.RefreshTokenRepository;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenCleanupService {

    private final RefreshTokenRepository refreshTokenRepository;

    /**
     * Runs every day at 2:00 AM to mark all expired refresh tokens as revoked.
     * Cron: second minute hour day-of-month month day-of-week
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void revokeExpiredTokens() {
        LocalDateTime now = LocalDateTime.now();
        log.info("[RefreshTokenCleanup] Starting expired session cleanup at {}", now);

        try {
            int count = refreshTokenRepository.revokeAllExpiredTokens(now);
            log.info("[RefreshTokenCleanup] Successfully revoked {} expired session(s)", count);
        } catch (Exception e) {
            log.error("[RefreshTokenCleanup] Failed to clean up expired sessions", e);
        }
    }
}
