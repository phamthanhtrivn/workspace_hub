package vn.workspacehub.user.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import vn.workspacehub.user.entity.RefreshToken;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.repository.RefreshTokenRepository;
import vn.workspacehub.user.util.HashUtils;
import java.time.LocalDateTime;
import java.util.UUID;

/** Internal collaborator; authentication transactions are owned by the AuthService facade. */
@Service
@RequiredArgsConstructor
public class AuthTokenIssuer {
    private final AuthServletAdapter servlet;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.secret_key}")
    private String jwtSecret;
    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    public String createAndSaveRefreshToken(User user, HttpServletRequest request, String ipAddress) {
        return createAndSaveRefreshToken(user, request, ipAddress, UUID.randomUUID(),
                LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000));
    }

    public String createAndSaveRefreshToken(User user, HttpServletRequest request, String ipAddress,
            UUID familyId, LocalDateTime expiresAt) {
        String rawRefreshToken = UUID.randomUUID().toString();
        String tokenHash = HashUtils.hmacSha256(rawRefreshToken, jwtSecret);

        AuthServletAdapter.TokenClientContext context = servlet.readTokenContext(request, ipAddress);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .familyId(familyId)
                .expiresAt(expiresAt)
                .ipAddress(ipAddress)
                .browser(context.browser())
                .operatingSystem(context.operatingSystem())
                .platform(context.platform())
                .deviceId(context.deviceId())
                .deviceName(context.deviceName())
                .location(context.location())
                .revoked(false)
                .build();

        refreshTokenRepository.save(refreshToken);
        return rawRefreshToken;
    }
}
