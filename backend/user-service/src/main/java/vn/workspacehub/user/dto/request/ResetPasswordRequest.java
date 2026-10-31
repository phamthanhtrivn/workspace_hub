package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.validation.PasswordBytes;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    @Size(max = AuthPolicy.MAX_EMAIL_LENGTH, message = "Email is too long")
    private String email;

    @NotBlank(message = "Reset token is required")
    @Size(max = AuthPolicy.MAX_CREDENTIAL_LENGTH, message = "Reset token is invalid")
    private String resetToken;

    @NotBlank(message = "New password is required")
    @PasswordBytes
    @Size(min = 8, max = 72, message = "Password must contain 8 to 72 characters")
    @Pattern(
            regexp = AuthPolicy.PASSWORD_PATTERN,
            message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
    private String newPassword;
}
