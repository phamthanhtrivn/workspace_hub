package vn.workspacehub.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSearchResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String avatarUrl;
}
