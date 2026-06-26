package vn.workspacehub.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.workspacehub.user.dto.request.UserSettingDto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSettingsOverviewDto {
    private UserProfileDto profile;
    private UserSettingDto settings;
    private List<SessionDto> sessions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfileDto {
        private String email;
        private String fullName;
        private String avatarUrl;
        private String role;
        private String status;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionDto {
        private UUID id;
        private String deviceName;
        private String browser;
        private String operatingSystem;
        private String location;
        private String ipAddress;
        private LocalDateTime expiresAt;
        private boolean isCurrentSession;
    }
}
