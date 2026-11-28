package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.validation.PasswordBytes;

import java.time.LocalDate;

@Getter
public class RegisterRequestDto {
    @NotBlank(message = "Full name is required")
    @Size(max = AuthPolicy.MAX_FULL_NAME_LENGTH, message = "Full name must not exceed 100 characters")
    private String fullName;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dob;

    @Email(message = "Email is invalid")
    @Size(max = AuthPolicy.MAX_EMAIL_LENGTH, message = "Email is too long")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    @PasswordBytes
    @Size(min = 8, max = 72, message = "Password must contain 8 to 72 characters")
    @Pattern(
            regexp = AuthPolicy.PASSWORD_PATTERN,
            message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
    private String password;
}
