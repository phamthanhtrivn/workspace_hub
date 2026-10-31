package vn.workspacehub.user.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import vn.workspacehub.user.dto.response.LoginResponseDto;
import vn.workspacehub.user.entity.RefreshToken;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.RefreshTokenRepository;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.util.HashUtils;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/** Internal collaborator; authentication transactions are owned by the AuthService facade. */
@Service
@RequiredArgsConstructor
public class AuthRefreshService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthTokenIssuer tokens;
    private final AuthServletAdapter servlet;
    private final AuthResponseMapper responses;
    @Value("${jwt.secret_key}")
    private String jwtSecret;

    public LoginResponseDto refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = servlet.extractRefreshToken(request);

        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return null;
        }

        String tokenHash = HashUtils.hmacSha256(rawRefreshToken, jwtSecret);

        Optional<UUID> userId = refreshTokenRepository.findUserIdByTokenHash(tokenHash);
        if (userId.isEmpty()) return null;
        // Always lock the user before the token, matching reset/login lock ordering.
        Optional<User> userOpt = userRepository.findForUpdateById(userId.get());
        if (userOpt.isEmpty()) return null;
        Optional<RefreshToken> storedTokenOpt = refreshTokenRepository.findForUpdateByTokenHash(tokenHash);
        if (storedTokenOpt.isEmpty()) {
            return null;
        }
        RefreshToken storedToken = storedTokenOpt.get();

        if (storedToken.isRevoked()) {
            if (storedToken.getRotatedAt() != null)
                refreshTokenRepository.revokeFamily(storedToken.getFamilyId(), LocalDateTime.now());
            return null;
        }

        if (userOpt.get().getStatus() != UserStatus.ACTIVE) {
            refreshTokenRepository.revokeAllForUser(userId.get(), LocalDateTime.now());
            return null;
        }

        if (storedToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            revokeToken(storedToken);
            return null;
        }

        String currentIp = servlet.getClientIpAddress(request);
        AuthServletAdapter.ClientAgent agent = servlet.readAgent(request);
        String currentBrowser = agent.browser();
        String currentOs = agent.operatingSystem();

        boolean ipMismatch = storedToken.getIpAddress() != null && !storedToken.getIpAddress().equals(currentIp);
        boolean browserMismatch = storedToken.getBrowser() != null && !storedToken.getBrowser().equals(currentBrowser);
        boolean osMismatch = storedToken.getOperatingSystem() != null
                && !storedToken.getOperatingSystem().equals(currentOs);

        if (ipMismatch || browserMismatch || osMismatch) {
            revokeToken(storedToken);
            throw new BusinessException("A security anomaly was detected. Please sign in again.");
        }

        revokeToken(storedToken);
        storedToken.setRotatedAt(LocalDateTime.now());
        String replacement = tokens.createAndSaveRefreshToken(userOpt.get(), request, currentIp,
                storedToken.getFamilyId(), storedToken.getExpiresAt());
        servlet.setRefreshTokenCookie(response, replacement, storedToken.getExpiresAt());
        return responses.buildLoginResponse(userOpt.get());
    }

    public void revokeToken(RefreshToken token) {
        token.setRevoked(true);
        token.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.save(token);
    }
}
