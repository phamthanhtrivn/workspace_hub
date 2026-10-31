package vn.workspacehub.user.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import vn.workspacehub.user.dto.response.LoginResponseDto;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;

/** Internal collaborator; authentication transactions are owned by the AuthService facade. */
@Service
@RequiredArgsConstructor
public class AuthResponseMapper {
    private final JwtService jwtService;


    public LoginResponseDto buildLoginResponse(User user) {
        UserProfile profile = user.getProfile();
        String fullName = profile != null ? profile.getFullName() : null;
        String avatarUrl = profile != null ? profile.getAvatarUrl() : null;

        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name(), fullName, avatarUrl);

        return LoginResponseDto.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .fullName(fullName)
                .avatarUrl(avatarUrl)
                .accessToken(accessToken)
                .build();
    }
}
