package vn.workspacehub.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSessionResponse {
    private UUID id;
    private String deviceId;
    private String deviceName;
    private String browser;
    private String operatingSystem;
    private String platform;
    private String location;
    private String ipAddress;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private boolean isCurrentSession;
}
