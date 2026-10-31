package vn.workspacehub.user.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.util.CookieUtils;
import vn.workspacehub.user.common.AuthPolicy;
import java.time.LocalDateTime;

/** Internal collaborator; authentication transactions are owned by the AuthService facade. */
@Service
@RequiredArgsConstructor
public class AuthServletAdapter {
    private final ClientIpResolver clientIpResolver;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;
    private static final String REFRESH_TOKEN_COOKIE = AuthPolicy.REFRESH_COOKIE;

    public String getClientIpAddress(HttpServletRequest request) {
        return clientIpResolver.resolve(request);
    }

    public void setRefreshTokenCookie(HttpServletResponse response, String rawRefreshToken) {
        CookieUtils.setCookie(response, REFRESH_TOKEN_COOKIE, rawRefreshToken,
                (int) (refreshTokenExpirationMs / 1000), "/");
    }

    public void setRefreshTokenCookie(HttpServletResponse response, String rawRefreshToken, LocalDateTime expiresAt) {
        long remaining = java.time.Duration.between(LocalDateTime.now(), expiresAt).getSeconds();
        CookieUtils.setCookie(response, REFRESH_TOKEN_COOKIE, rawRefreshToken,
                (int) Math.max(0, Math.min(remaining, refreshTokenExpirationMs / 1000)), "/");
    }

    public String extractRefreshToken(HttpServletRequest request) {
        return CookieUtils.extractCookie(request, REFRESH_TOKEN_COOKIE);
    }
    public void clearRefreshTokenCookie(HttpServletResponse response) {
        CookieUtils.clearCookie(response, REFRESH_TOKEN_COOKIE, "/");
    }
    public ClientAgent readAgent(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        return new ClientAgent(vn.workspacehub.user.util.DeviceUtils.extractBrowser(userAgent), vn.workspacehub.user.util.DeviceUtils.extractOperatingSystem(userAgent));
    }
    public TokenClientContext readTokenContext(HttpServletRequest request, String ipAddress) {
        String userAgent = request.getHeader("User-Agent");
        String browser = vn.workspacehub.user.util.DeviceUtils.extractBrowser(userAgent);
        String os = vn.workspacehub.user.util.DeviceUtils.extractOperatingSystem(userAgent);
        String platform = vn.workspacehub.user.util.DeviceUtils.extractPlatform(userAgent);
        String deviceId = vn.workspacehub.user.util.DeviceUtils.extractDeviceId(request);
        String deviceName = vn.workspacehub.user.util.DeviceUtils.extractDeviceName(request);
        return new TokenClientContext(browser, os, platform, deviceId, deviceName, vn.workspacehub.user.util.GeoIpUtils.getLocationFromIp(ipAddress));
    }
    public record ClientAgent(String browser, String operatingSystem) {}
    public record TokenClientContext(String browser, String operatingSystem, String platform, String deviceId, String deviceName, String location) {}

}
