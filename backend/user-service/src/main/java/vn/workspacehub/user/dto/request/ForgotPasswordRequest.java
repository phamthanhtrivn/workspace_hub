package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import vn.workspacehub.user.common.AuthPolicy;
import lombok.Data;

@Data
public class ForgotPasswordRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    @Size(max = AuthPolicy.MAX_EMAIL_LENGTH, message = "Email is too long")
    private String email;
}
