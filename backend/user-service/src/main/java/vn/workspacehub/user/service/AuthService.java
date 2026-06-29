package vn.workspacehub.user.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import vn.workspacehub.user.dto.request.RegisterRequestDto;
import vn.workspacehub.user.dto.response.LoginResponseDto;
import vn.workspacehub.user.dto.response.UserSessionResponse;
import vn.workspacehub.user.entity.*;
import vn.workspacehub.user.enums.UserRole;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.*;
import vn.workspacehub.user.util.CookieUtils;
import vn.workspacehub.user.util.HashUtils;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import vn.workspacehub.user.enums.OAuthProvider;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserProfileRepository userProfileRepository;
    private final OAuthAccountRepository oauthAccountRepository;
    private final AccountSettingRepository accountSettingRepository;

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    @Value("${jwt.secret_key}")
    private String jwtSecret;
    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;
    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String googleClientId;

    @Transactional
    public LoginResponseDto login(String email, String password, HttpServletRequest request,
            HttpServletResponse response) {
        User user = userRepository.findUserByEmail(email)
                .orElseThrow(() -> new BusinessException("Email hoặc mật khẩu không chính xác"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException("Email hoặc mật khẩu không chính xác");
        }

        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());

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
    public LoginResponseDto socialLogin(OAuthProvider provider, String credential, HttpServletRequest request,
            HttpServletResponse response) {
        if (provider == OAuthProvider.GOOGLE) {
            return processGoogleLogin(credential, request, response);
        }
        // TODO: Handle LinkedIn
        throw new BusinessException("Provider không được hỗ trợ");
    }

    private LoginResponseDto processGoogleLogin(String credential, HttpServletRequest request,
            HttpServletResponse response) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(credential);
            HttpEntity<?> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> responseEntity;
            try {
                responseEntity = restTemplate.exchange(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        HttpMethod.GET,
                        entity,
                        Map.class);
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                throw new BusinessException("Lỗi xác thực Google: " + e.getResponseBodyAsString());
            }

            Map<String, Object> payload = responseEntity.getBody();
            if (payload == null || !payload.containsKey("email")) {
                throw new BusinessException("Không thể lấy thông tin người dùng từ Google");
            }

            String email = (String) payload.get("email");
            String providerUserId = (String) payload.get("sub");
            String fullName = (String) payload.get("name");
            String avatarUrl = (String) payload.get("picture");

            return processOAuthUser(email, providerUserId, OAuthProvider.GOOGLE, fullName, avatarUrl, request,
                    response);
        } catch (Exception e) {
            e.printStackTrace();
            throw new BusinessException("Xác thực Google thất bại: " + e.getClass().getName() + " - " + e.getMessage());
        }
    }

    private LoginResponseDto processOAuthUser(String email, String providerUserId, OAuthProvider provider,
            String fullName, String avatarUrl, HttpServletRequest request, HttpServletResponse response) {
        // 1. Kiểm tra OAuth Account đã liên kết chưa
        Optional<OAuthAccount> optionalOAuth = oauthAccountRepository.findByProviderAndProviderUserId(provider,
                providerUserId);

        User user;
        if (optionalOAuth.isPresent()) {
            user = optionalOAuth.get().getUser();
        } else {
            // 2. Nếu chưa liên kết, kiểm tra email
            Optional<User> optionalUser = userRepository.findUserByEmail(email);
            if (optionalUser.isPresent()) {
                user = optionalUser.get();
            } else {
                // 3. Tạo User mới nếu email chưa tồn tại
                user = User.builder()
                        .email(email)
                        .passwordHash("") // Không cần password cho social login
                        .role(UserRole.USER)
                        .status(UserStatus.ACTIVE)
                        .build();
                user = userRepository.save(user);

                UserProfile userProfile = UserProfile.builder()
                        .user(user)
                        .fullName(fullName)
                        .avatarUrl(avatarUrl)
                        .build();
                userProfileRepository.save(userProfile);

                AccountSetting accountSetting = AccountSetting.builder()
                        .user(user)
                        .theme("light")
                        .language("vi")
                        .timezone("Asia/Ho_Chi_Minh")
                        .build();
                accountSettingRepository.save(accountSetting);
            }

            // 4. Tạo và lưu OAuth Account
            OAuthAccount oauthAccount = OAuthAccount.builder()
                    .user(user)
                    .provider(provider)
                    .providerUserId(providerUserId)
                    .build();
            oauthAccountRepository.save(oauthAccount);
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException("Tài khoản của bạn đã bị khóa");
        }

        // Tạo JWT cho session
        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());

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
        boolean osMismatch = storedToken.getOperatingSystem() != null
                && !storedToken.getOperatingSystem().equals(currentOs);

        if (ipMismatch || browserMismatch || osMismatch) {
            revokeToken(storedToken);
            throw new BusinessException("Phát hiện bất thường về bảo mật. Vui lòng đăng nhập lại.");
        }

        User user = storedToken.getUser();

        String newAccessToken = jwtService.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());

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

        CookieUtils.clearCookie(response, REFRESH_TOKEN_COOKIE, "/");
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

        AccountSetting accountSetting = AccountSetting.builder()
                .user(savedUser)
                .theme("light")
                .language("vi")
                .timezone("Asia/Ho_Chi_Minh")
                .build();
        accountSettingRepository.save(accountSetting);
    }

    @Transactional(readOnly = true)
    public List<UserSessionResponse> getActiveSessions(UUID userId, HttpServletRequest request) {
        String rawRefreshToken = CookieUtils.extractCookie(request, REFRESH_TOKEN_COOKIE);
        String currentTokenHash = (rawRefreshToken != null && !rawRefreshToken.isBlank())
                ? HashUtils.hmacSha256(rawRefreshToken, jwtSecret)
                : null;

        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedFalseOrderByCreatedAtDesc(userId);
        return tokens.stream().map(token -> {
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

    @Transactional
    public void revokeSession(UUID userId, UUID sessionId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Người dùng không tồn tại"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu không chính xác");
        }

        RefreshToken token = refreshTokenRepository.findByIdAndUserIdAndRevokedFalse(sessionId, userId)
                .orElseThrow(() -> new BusinessException("Phiên đăng nhập không tồn tại hoặc đã bị thu hồi"));

        revokeToken(token);
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
                (int) (refreshTokenExpirationMs / 1000), "/");
    }

    private void revokeToken(RefreshToken token) {
        token.setRevoked(true);
        token.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.save(token);
    }
}
