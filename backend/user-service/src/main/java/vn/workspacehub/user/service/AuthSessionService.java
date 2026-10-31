package vn.workspacehub.user.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.workspacehub.user.dto.response.UserSessionResponse;
import vn.workspacehub.user.entity.RefreshToken;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.exception.ResourceNotFoundException;
import vn.workspacehub.user.repository.RefreshTokenRepository;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.util.HashUtils;
import vn.workspacehub.user.common.AuthPolicy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/** Internal collaborator; authentication transactions are owned by the AuthService facade. */
@Service
@RequiredArgsConstructor
public class AuthSessionService {
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthServletAdapter servlet;
    @Value("${jwt.secret_key}")
    private String jwtSecret;

    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = servlet.extractRefreshToken(request);

        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String tokenHash = HashUtils.hmacSha256(rawRefreshToken, jwtSecret);
            refreshTokenRepository.findUserIdByTokenHash(tokenHash).ifPresent(userId -> {
                userRepository.findForUpdateById(userId);
                refreshTokenRepository.findForUpdateByTokenHash(tokenHash)
                        .ifPresent(token -> refreshTokenRepository.revokeFamily(token.getFamilyId(), LocalDateTime.now()));
            });
        }

        servlet.clearRefreshTokenCookie(response);
    }

    public List<UserSessionResponse> getActiveSessions(UUID userId, HttpServletRequest request) {
        String rawRefreshToken = servlet.extractRefreshToken(request);
        String currentTokenHash = (rawRefreshToken != null && !rawRefreshToken.isBlank())
                ? HashUtils.hmacSha256(rawRefreshToken, jwtSecret)
                : null;

        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedFalseOrderByCreatedAtDesc(userId);
        LocalDateTime now = LocalDateTime.now();

        return tokens.stream()
                .filter(token -> token.getExpiresAt().isAfter(now))
                .map(token -> {
                    boolean isCurrent = currentTokenHash != null && currentTokenHash.equals(token.getTokenHash());
                    return UserSessionResponse.builder()
                            .id(token.getId())
                            .deviceId(token.getDeviceId())
                            .deviceName(token.getDeviceName())
                            .browser(token.getBrowser())
                            .operatingSystem(token.getOperatingSystem())
                            .platform(token.getPlatform())
                            .location(token.getLocation())
                            .ipAddress(token.getIpAddress())
                            .expiresAt(token.getExpiresAt())
                            .createdAt(token.getCreatedAt())
                            .isCurrentSession(isCurrent)
                            .build();
                }).collect(Collectors.toList());
    }

    public void revokeSession(UUID userId, UUID sessionId, String password) {
        User user = userRepository.findForUpdateById(userId)
                .orElseThrow(() -> new BusinessException("User does not exist"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException("Password is incorrect");
        }

        RefreshToken token = refreshTokenRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(AuthPolicy.SESSION_NOT_FOUND));

        refreshTokenRepository.revokeFamily(token.getFamilyId(), LocalDateTime.now());
    }
}
