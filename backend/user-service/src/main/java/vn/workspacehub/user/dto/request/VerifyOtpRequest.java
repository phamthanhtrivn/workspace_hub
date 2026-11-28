package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import vn.workspacehub.user.common.AuthPolicy;
import lombok.Data;

@Data
public class VerifyOtpRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    @Size(max = AuthPolicy.MAX_EMAIL_LENGTH, message = "Email is too long")
    private String email;

    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "[0-9]{6}", message = "OTP must contain six digits")
    private String otp;
}
