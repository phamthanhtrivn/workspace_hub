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
import vn.workspacehub.user.dto.response.UserSessionResponse;
import vn.workspacehub.user.entity.AccountSetting;
import vn.workspacehub.user.entity.OAuthAccount;
import vn.workspacehub.user.entity.RefreshToken;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.enums.AccountLanguage;
import vn.workspacehub.user.enums.OAuthProvider;
import vn.workspacehub.user.enums.UserRole;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.events.UserProfileEventPublisher;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.exception.ResourceNotFoundException;
import vn.workspacehub.user.repository.AccountSettingRepository;
import vn.workspacehub.user.repository.OAuthAccountRepository;
import vn.workspacehub.user.repository.RefreshTokenRepository;
import vn.workspacehub.user.repository.UserProfileRepository;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.util.CookieUtils;
import vn.workspacehub.user.util.HashUtils;
import vn.workspacehub.user.util.EmailUtils;
import vn.workspacehub.user.common.AuthPolicy;
import jakarta.annotation.PostConstruct;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
    private final UserProfileEventPublisher userProfileEventPublisher;
    private final AuthAttemptLimiter attemptLimiter;
    private final ClientIpResolver clientIpResolver;
    private final GoogleIdentityVerifier googleIdentityVerifier;
    private String dummyPasswordHash;

    private static final String REFRESH_TOKEN_COOKIE = AuthPolicy.REFRESH_COOKIE;

    @PostConstruct
    void initializePasswordTiming() {
        dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Value("${jwt.secret_key}")
    private String jwtSecret;
    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    @Transactional
    public LoginResponseDto login(String email, String password, HttpServletRequest request,
            HttpServletResponse response) {
        email = EmailUtils.normalize(email);
        attemptLimiter.beforeLogin(email);
        Optional<User> candidate = userRepository.findForUpdateByEmail(email);
        String hash = candidate.map(User::getPasswordHash).filter(value -> !value.isBlank()).orElse(dummyPasswordHash);
        boolean passwordMatches = passwordEncoder.matches(password, hash);
        if (candidate.isEmpty() || !passwordMatches || candidate.get().getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(AuthPolicy.INVALID_CREDENTIALS);
        }
        User user = candidate.get();
        attemptLimiter.loginSucceeded(email);

        String ipAddress = getClientIpAddress(request);

        String rawRefreshToken = createAndSaveRefreshToken(user, request, ipAddress);
        setRefreshTokenCookie(response, rawRefreshToken);

        return buildLoginResponse(user);
    }

    @Transactional
    public LoginResponseDto socialLogin(OAuthProvider provider, String credential, HttpServletRequest request,
            HttpServletResponse response) {
        if (provider == OAuthProvider.GOOGLE) {
            return processGoogleLogin(credential, request, response);
        }
        throw new BusinessException("Provider is not supported");
    }

    private LoginResponseDto processGoogleLogin(String credential, HttpServletRequest request,
            HttpServletResponse response) {
        GoogleIdentityVerifier.Identity identity = googleIdentityVerifier.verify(credential);
        return processOAuthUser(identity.email(), identity.subject(), OAuthProvider.GOOGLE,
                identity.fullName(), identity.avatarUrl(), request, response);
    }

    private LoginResponseDto processOAuthUser(String email, String providerUserId, OAuthProvider provider,
            String fullName, String avatarUrl, HttpServletRequest request, HttpServletResponse response) {
        Optional<UUID> optionalOAuth = oauthAccountRepository.findUserIdByProviderAndSubject(provider,
                providerUserId);

        User user;
        if (optionalOAuth.isPresent()) {
            user = userRepository.findForUpdateById(optionalOAuth.get())
                    .orElseThrow(() -> new BusinessException(AuthPolicy.GOOGLE_FAILED));
        } else {
            Optional<User> optionalUser = userRepository.findForUpdateByEmail(email);
            if (optionalUser.isPresent()) {
                user = optionalUser.get();
                if (!user.isEmailVerified() && user.getPasswordHash() != null && !user.getPasswordHash().isBlank()) {
                    throw new BusinessException("Reset your password to verify email ownership before linking Google.");
                }
            } else {
                user = User.builder()
                        .email(email)
                        .emailVerified(true)
                        .passwordHash("")
                        .role(UserRole.USER)
                        .status(UserStatus.ACTIVE)
                        .build();
                user = userRepository.save(user);

                UserProfile userProfile = UserProfile.builder()
                        .user(user)
                        .fullName(fullName)
                        .avatarUrl(avatarUrl)
                        .build();
                userProfile = userProfileRepository.save(userProfile);
                user.setProfile(userProfile);
                userProfileEventPublisher.publishSnapshotUpsertedAfterCommit(user);

                AccountSetting accountSetting = AccountSetting.builder()
                        .user(user)
                        .theme("light")
                        .language(AccountLanguage.VIETNAMESE.getValue())
                        .timezone("Asia/Ho_Chi_Minh")
                        .build();
                accountSettingRepository.save(accountSetting);
            }

            OAuthAccount oauthAccount = OAuthAccount.builder()
                    .user(user)
                    .provider(provider)
                    .providerUserId(providerUserId)
                    .build();
            oauthAccountRepository.save(oauthAccount);
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(AuthPolicy.GOOGLE_FAILED);
        }
        user.setEmailVerified(true);

        String ipAddress = getClientIpAddress(request);
        String rawRefreshToken = createAndSaveRefreshToken(user, request, ipAddress);
        setRefreshTokenCookie(response, rawRefreshToken);

        return buildLoginResponse(user);
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public LoginResponseDto refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = CookieUtils.extractCookie(request, REFRESH_TOKEN_COOKIE);

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
            throw new BusinessException("A security anomaly was detected. Please sign in again.");
        }

        revokeToken(storedToken);
        storedToken.setRotatedAt(LocalDateTime.now());
        String replacement = createAndSaveRefreshToken(userOpt.get(), request, currentIp,
                storedToken.getFamilyId(), storedToken.getExpiresAt());
        setRefreshTokenCookie(response, replacement, storedToken.getExpiresAt());
        return buildLoginResponse(userOpt.get());
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = CookieUtils.extractCookie(request, REFRESH_TOKEN_COOKIE);

        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String tokenHash = HashUtils.hmacSha256(rawRefreshToken, jwtSecret);
            refreshTokenRepository.findUserIdByTokenHash(tokenHash).ifPresent(userId -> {
                userRepository.findForUpdateById(userId);
                refreshTokenRepository.findForUpdateByTokenHash(tokenHash)
                        .ifPresent(token -> refreshTokenRepository.revokeFamily(token.getFamilyId(), LocalDateTime.now()));
            });
        }

        CookieUtils.clearCookie(response, REFRESH_TOKEN_COOKIE, "/");
    }

    @Transactional
    public void register(RegisterRequestDto dto) {
        String email = EmailUtils.normalize(dto.getEmail());
        String passwordHash = passwordEncoder.encode(dto.getPassword());
        if (userRepository.existsByEmail(email)) return;

        User user = User.builder()
                .email(email)
                .passwordHash(passwordHash)
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
        savedUser.setProfile(userProfile);
        userProfileEventPublisher.publishSnapshotUpsertedAfterCommit(savedUser);

        AccountSetting accountSetting = AccountSetting.builder()
                .user(savedUser)
                .theme("light")
                .language(AccountLanguage.VIETNAMESE.getValue())
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

    @Transactional
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

    private String getClientIpAddress(HttpServletRequest request) {
        return clientIpResolver.resolve(request);
    }

    private String createAndSaveRefreshToken(User user, HttpServletRequest request, String ipAddress) {
        return createAndSaveRefreshToken(user, request, ipAddress, UUID.randomUUID(),
                LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000));
    }

    private String createAndSaveRefreshToken(User user, HttpServletRequest request, String ipAddress,
            UUID familyId, LocalDateTime expiresAt) {
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
                .familyId(familyId)
                .expiresAt(expiresAt)
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

    private void setRefreshTokenCookie(HttpServletResponse response, String rawRefreshToken, LocalDateTime expiresAt) {
        long remaining = java.time.Duration.between(LocalDateTime.now(), expiresAt).getSeconds();
        CookieUtils.setCookie(response, REFRESH_TOKEN_COOKIE, rawRefreshToken,
                (int) Math.max(0, Math.min(remaining, refreshTokenExpirationMs / 1000)), "/");
    }

    private LoginResponseDto buildLoginResponse(User user) {
        UserProfile profile = user.getProfile();
        String fullName = profile != null ? profile.getFullName() : null;
        String avatarUrl = profile != null ? profile.getAvatarUrl() : null;

        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name(), fullName, avatarUrl);

        return LoginResponseDto.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .fullName(fullName)
                .avatarUrl(avatarUrl)
                .accessToken(accessToken)
                .build();
    }

    private void revokeToken(RefreshToken token) {
        token.setRevoked(true);
        token.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.save(token);
    }
}
