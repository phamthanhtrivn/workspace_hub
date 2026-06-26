package vn.workspacehub.user.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.dto.request.UserSettingDto;
import vn.workspacehub.user.dto.response.UserSettingsOverviewDto;
import vn.workspacehub.user.entity.AccountSetting;
import vn.workspacehub.user.entity.RefreshToken;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.AccountSettingRepository;
import vn.workspacehub.user.repository.RefreshTokenRepository;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.util.CookieUtils;
import vn.workspacehub.user.util.HashUtils;
import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserSettingsService {

    private final AccountSettingRepository accountSettingRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.secret_key}")
    private String jwtSecret;

    @Transactional(readOnly = true)
    public UserSettingsOverviewDto getUserSettingsOverview(UUID userId, HttpServletRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Người dùng không tồn tại"));

        AccountSetting setting = accountSettingRepository.findByUserId(userId)
                .orElseGet(() -> AccountSetting.builder().user(user).build());

        String rawRefreshToken = CookieUtils.extractCookie(request, "refreshToken");
        String currentTokenHash = (rawRefreshToken != null) ? HashUtils.hmacSha256(rawRefreshToken, jwtSecret) : null;

        List<RefreshToken> activeTokens = refreshTokenRepository.findByUserIdAndRevokedFalse(userId);

        List<UserSettingsOverviewDto.SessionDto> sessions = activeTokens.stream()
                .filter(t -> t.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(t -> UserSettingsOverviewDto.SessionDto.builder()
                        .id(t.getId())
                        .deviceName(t.getDeviceName())
                        .browser(t.getBrowser())
                        .operatingSystem(t.getOperatingSystem())
                        .location(t.getLocation())
                        .ipAddress(t.getIpAddress())
                        .expiresAt(t.getExpiresAt())
                        .isCurrentSession(currentTokenHash != null && currentTokenHash.equals(t.getTokenHash()))
                        .build())
                .collect(Collectors.toList());

        UserSettingsOverviewDto.UserProfileDto profileDto = UserSettingsOverviewDto.UserProfileDto.builder()
                .email(user.getEmail())
                .fullName(user.getProfile() != null ? user.getProfile().getFullName() : "")
                .avatarUrl(user.getProfile() != null ? user.getProfile().getAvatarUrl() : "")
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .createdAt(user.getCreatedAt())
                .build();

        UserSettingDto settingsDto = UserSettingDto.builder()
                .theme(setting.getTheme())
                .language(setting.getLanguage())
                .timezone(setting.getTimezone())
                .emailNotificationEnabled(setting.isEmailNotificationEnabled())
                .pushNotificationEnabled(setting.isPushNotificationEnabled())
                .build();

        return UserSettingsOverviewDto.builder()
                .profile(profileDto)
                .settings(settingsDto)
                .sessions(sessions)
                .build();
    }

    @Transactional
    public UserSettingDto updateUserSettings(UUID userId, UserSettingDto dto) {
        AccountSetting setting = accountSettingRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new BusinessException("Người dùng không tồn tại"));
                    return AccountSetting.builder().user(user).build();
                });

        setting.setTheme(dto.getTheme());
        setting.setLanguage(dto.getLanguage());
        setting.setTimezone(dto.getTimezone());
        setting.setEmailNotificationEnabled(dto.getEmailNotificationEnabled());
        setting.setPushNotificationEnabled(dto.getPushNotificationEnabled());

        accountSettingRepository.save(setting);

        return dto;
    }
}
