package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import vn.workspacehub.user.common.AuthPolicy;
import lombok.Getter;
import vn.workspacehub.user.validation.PasswordBytes;

@Getter
public class LoginRequestDto {

    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    @Size(max = AuthPolicy.MAX_EMAIL_LENGTH, message = "Email is too long")
    private String email;

    @NotBlank(message = "Password is required")
    @PasswordBytes
    private String password;
}
