package vn.workspacehub.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.workspacehub.user.enums.UserRole;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponseDto {
    private UUID userId;
    private String email;
    private UserRole role;
    private String accessToken;
}


