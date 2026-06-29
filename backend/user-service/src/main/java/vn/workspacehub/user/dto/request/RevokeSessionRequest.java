package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevokeSessionRequest {
    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}
