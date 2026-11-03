package vn.workspacehub.user.dto.response;

import java.util.UUID;
import vn.workspacehub.user.entity.User;

public record PublicUserProfileResponse(UUID id, String email, String fullName, String avatarUrl, String bio) {
    public static PublicUserProfileResponse from(User user) {
        var profile = user.getProfile();
        return new PublicUserProfileResponse(user.getId(), user.getEmail(),
                profile == null ? null : profile.getFullName(),
                profile == null ? null : profile.getAvatarUrl(),
                profile == null ? null : profile.getBio());
    }
}
