package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserProfileRequest {
    
    @NotBlank(message = "Họ Tên không được trống")
    @Pattern(
            regexp = "^[\\p{L}\\s]+$",
            message = "Họ tên không hợp lệ. Chỉ được chứa chữ cái và khoảng trắng"
    )
    @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
    private String fullName;

    private String avatarUrl;

    @Pattern(regexp = "^(0[3|5|7|8|9])+([0-9]{8})$", message = "Số điện thoại không hợp lệ")
    private String phoneNumber;

    @Past(message = "Ngày sinh phải trong quá khứ")
    private LocalDate dob;

    @Size(max = 1000, message = "Tiểu sử không được vượt quá 1000 ký tự")
    private String bio;
}
