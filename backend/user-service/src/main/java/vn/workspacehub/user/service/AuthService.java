package vn.workspacehub.user.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.dto.request.RegisterRequestDto;
import vn.workspacehub.user.dto.response.LoginResponseDto;
import vn.workspacehub.user.entity.RefreshToken;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.enums.UserRole;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.RefreshTokenRepository;
import vn.workspacehub.user.repository.UserProfileRepository;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.util.CookieUtils;
import vn.workspacehub.user.util.HashUtils;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserProfileRepository userProfileRepository;

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private static final String COOKIE_PATH = "/api/auth";

    @Value("${jwt.secret_key}")
    private String jwtSecret;
    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    @Transactional
    public LoginResponseDto login(String email, String password, HttpServletRequest request, HttpServletResponse response) {
        User user = userRepository.findUserByEmail(email)
                .orElseThrow(() -> new BusinessException("Email hoặc mật khẩu không chính xác"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException("Email hoặc mật khẩu không chính xác");
        }

        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name()
        );

        String ipAddress = getClientIpAddress(request);

        String rawRefreshToken = createAndSaveRefreshToken(user, request, ipAddress);
        setRefreshTokenCookie(response, rawRefreshToken);

        return LoginResponseDto.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .accessToken(accessToken)
                .build();
    }

    @Transactional
    public LoginResponseDto refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = CookieUtils.extractCookie(request, REFRESH_TOKEN_COOKIE);

        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new BusinessException("Refresh token không hợp lệ");
        }

        String tokenHash = HashUtils.hmacSha256(rawRefreshToken, jwtSecret);

        RefreshToken storedToken = refreshTokenRepository
                .findByTokenHashAndRevokedFalse(tokenHash)
                .orElseThrow(() -> new BusinessException("Refresh token không hợp lệ hoặc đã bị thu hồi"));

        if (storedToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            revokeToken(storedToken);
            throw new BusinessException("Refresh token đã hết hạn");
        }

        // Anomaly Detection (Device Binding)
        String currentIp = getClientIpAddress(request);
        String currentUa = request.getHeader("User-Agent");
        String currentBrowser = vn.workspacehub.user.util.DeviceUtils.extractBrowser(currentUa);
        String currentOs = vn.workspacehub.user.util.DeviceUtils.extractOperatingSystem(currentUa);

        boolean ipMismatch = storedToken.getIpAddress() != null && !storedToken.getIpAddress().equals(currentIp);
        boolean browserMismatch = storedToken.getBrowser() != null && !storedToken.getBrowser().equals(currentBrowser);
        boolean osMismatch = storedToken.getOperatingSystem() != null && !storedToken.getOperatingSystem().equals(currentOs);

        if (ipMismatch || browserMismatch || osMismatch) {
            revokeToken(storedToken);
            throw new BusinessException("Phát hiện bất thường về bảo mật. Vui lòng đăng nhập lại.");
        }

        User user = storedToken.getUser();

        String newAccessToken = jwtService.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name()
        );

        return LoginResponseDto.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .accessToken(newAccessToken)
                .build();
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = CookieUtils.extractCookie(request, REFRESH_TOKEN_COOKIE);

        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String tokenHash = HashUtils.hmacSha256(rawRefreshToken, jwtSecret);
            refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash)
                    .ifPresent(this::revokeToken);
        }

        CookieUtils.clearCookie(response, REFRESH_TOKEN_COOKIE, COOKIE_PATH);
    }

    @Transactional
    public void register(RegisterRequestDto dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Email đã tồn tại trong hệ thống");
        }

        User user = User.builder()
                .email(dto.getEmail())
                .passwordHash(passwordEncoder.encode(dto.getPassword()))
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);

        UserProfile userProfile = UserProfile.builder()
                .user(savedUser)
                .fullName(dto.getFullName())
                .dob(dto.getDob())
                .build();

        userProfileRepository.save(userProfile);
    }

    // ── Private helpers ──

    private String getClientIpAddress(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }


    private String createAndSaveRefreshToken(User user, HttpServletRequest request, String ipAddress) {
        String rawRefreshToken = UUID.randomUUID().toString();
        String tokenHash = HashUtils.hmacSha256(rawRefreshToken, jwtSecret);

        String userAgent = request.getHeader("User-Agent");
        String browser = vn.workspacehub.user.util.DeviceUtils.extractBrowser(userAgent);
        String os = vn.workspacehub.user.util.DeviceUtils.extractOperatingSystem(userAgent);
        String platform = vn.workspacehub.user.util.DeviceUtils.extractPlatform(userAgent);
        String deviceId = vn.workspacehub.user.util.DeviceUtils.extractDeviceId(request);
        String deviceName = vn.workspacehub.user.util.DeviceUtils.extractDeviceName(request);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000))
                .ipAddress(ipAddress)
                .browser(browser)
                .operatingSystem(os)
                .platform(platform)
                .deviceId(deviceId)
                .deviceName(deviceName)
                .location(vn.workspacehub.user.util.GeoIpUtils.getLocationFromIp(ipAddress))
                .revoked(false)
                .build();

        refreshTokenRepository.save(refreshToken);
        return rawRefreshToken;
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String rawRefreshToken) {
        CookieUtils.setCookie(response, REFRESH_TOKEN_COOKIE, rawRefreshToken,
                (int) (refreshTokenExpirationMs / 1000), COOKIE_PATH);
    }

    private void revokeToken(RefreshToken token) {
        token.setRevoked(true);
        token.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.save(token);
    }
}


