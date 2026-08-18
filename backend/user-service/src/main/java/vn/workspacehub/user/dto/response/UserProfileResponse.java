package vn.workspacehub.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String phoneNumber;
    private LocalDate dob;
    private String bio;
}
