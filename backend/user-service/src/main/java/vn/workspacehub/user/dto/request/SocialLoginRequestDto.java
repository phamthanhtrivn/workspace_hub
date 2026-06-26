package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import vn.workspacehub.user.enums.OAuthProvider;

@Data
public class SocialLoginRequestDto {

    private OAuthProvider provider;

    @NotBlank(message = "Token/Code không được để trống")
    private String credential;
}
