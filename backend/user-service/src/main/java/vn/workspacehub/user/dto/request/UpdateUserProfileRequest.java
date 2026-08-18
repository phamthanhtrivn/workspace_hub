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

    @NotBlank(message = "Full name is required")
    @Pattern(
            regexp = "^[\\p{L}\\s]+$",
            message = "Full name is invalid. Only letters and spaces are allowed"
    )
    @Size(max = 100, message = "Full name must not exceed 100 characters")
    private String fullName;

    private String avatarUrl;

    @Pattern(regexp = "^(0[3|5|7|8|9])+([0-9]{8})$", message = "Phone number is invalid")
    private String phoneNumber;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dob;

    @Size(max = 1000, message = "Bio must not exceed 1000 characters")
    private String bio;
}
