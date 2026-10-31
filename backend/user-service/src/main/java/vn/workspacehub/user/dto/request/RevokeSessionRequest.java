package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.workspacehub.user.validation.PasswordBytes;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevokeSessionRequest {
    @NotBlank(message = "Password is required")
    @PasswordBytes
    private String password;
}
