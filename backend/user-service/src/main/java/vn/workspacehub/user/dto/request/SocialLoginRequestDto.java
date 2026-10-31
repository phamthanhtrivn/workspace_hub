package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import vn.workspacehub.user.common.AuthPolicy;
import lombok.Data;
import vn.workspacehub.user.enums.OAuthProvider;

@Data
public class SocialLoginRequestDto {

    @NotNull(message = "Provider is required")
    private OAuthProvider provider;

    @NotBlank(message = "Token/code is required")
    @Size(max = AuthPolicy.MAX_CREDENTIAL_LENGTH, message = "Credential is invalid")
    private String credential;
}
