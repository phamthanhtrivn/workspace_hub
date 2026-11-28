package vn.workspacehub.user.service;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.repository.RefreshTokenRepository;
import vn.workspacehub.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class SessionAuthorizationService {
    private final UserRepository users;
    private final RefreshTokenRepository tokens;

    @Transactional(readOnly = true)
    public boolean isActive(UUID userId, UUID sessionId) {
        return users.findById(userId)
                .filter(user -> user.getStatus() == UserStatus.ACTIVE && user.isEmailVerified()).isPresent()
                && tokens.existsByUser_IdAndFamilyIdAndRevokedFalseAndExpiresAtAfter(userId, sessionId, LocalDateTime.now());
    }
}
