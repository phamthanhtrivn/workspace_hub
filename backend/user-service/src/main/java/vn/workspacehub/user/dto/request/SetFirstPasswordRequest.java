package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.validation.PasswordBytes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SetFirstPasswordRequest {

    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "[0-9]{6}", message = "OTP must contain six digits")
    private String otp;

    @NotBlank(message = "New password is required")
    @PasswordBytes
    @Size(min = 8, max = 72, message = "Password must contain 8 to 72 characters")
    @Pattern(regexp = AuthPolicy.PASSWORD_PATTERN, message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
    private String newPassword;

    @NotBlank(message = "Confirm password is required")
    @PasswordBytes
    private String confirmPassword;
}
