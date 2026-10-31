package vn.workspacehub.user.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vn.workspacehub.user.dto.response.LoginResponseDto;
import vn.workspacehub.user.entity.AccountSetting;
import vn.workspacehub.user.entity.OAuthAccount;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.enums.AccountLanguage;
import vn.workspacehub.user.enums.OAuthProvider;
import vn.workspacehub.user.enums.UserRole;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.events.UserProfileEventPublisher;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.AccountSettingRepository;
import vn.workspacehub.user.repository.OAuthAccountRepository;
import vn.workspacehub.user.repository.UserProfileRepository;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.common.AuthPolicy;
import java.util.Optional;
import java.util.UUID;

/** Internal collaborator; authentication transactions are owned by the AuthService facade. */
@Service
@RequiredArgsConstructor
public class AuthSocialLoginService {
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final OAuthAccountRepository oauthAccountRepository;
    private final AccountSettingRepository accountSettingRepository;
    private final UserProfileEventPublisher userProfileEventPublisher;
    private final GoogleIdentityVerifier googleIdentityVerifier;
    private final AuthTokenIssuer tokens;
    private final AuthServletAdapter servlet;
    private final AuthResponseMapper responses;

    public LoginResponseDto socialLogin(OAuthProvider provider, String credential, HttpServletRequest request,
            HttpServletResponse response) {
        if (provider == OAuthProvider.GOOGLE) {
            return processGoogleLogin(credential, request, response);
        }
        throw new BusinessException("Provider is not supported");
    }

    public LoginResponseDto processGoogleLogin(String credential, HttpServletRequest request,
            HttpServletResponse response) {
        GoogleIdentityVerifier.Identity identity = googleIdentityVerifier.verify(credential);
        return processOAuthUser(identity.email(), identity.subject(), OAuthProvider.GOOGLE,
                identity.fullName(), identity.avatarUrl(), request, response);
    }

    public LoginResponseDto processOAuthUser(String email, String providerUserId, OAuthProvider provider,
            String fullName, String avatarUrl, HttpServletRequest request, HttpServletResponse response) {
        Optional<UUID> optionalOAuth = oauthAccountRepository.findUserIdByProviderAndSubject(provider,
                providerUserId);

        User user;
        if (optionalOAuth.isPresent()) {
            user = userRepository.findForUpdateById(optionalOAuth.get())
                    .orElseThrow(() -> new BusinessException(AuthPolicy.GOOGLE_FAILED));
        } else {
            Optional<User> optionalUser = userRepository.findForUpdateByEmail(email);
            if (optionalUser.isPresent()) {
                user = optionalUser.get();
                if (!user.isEmailVerified() && user.getPasswordHash() != null && !user.getPasswordHash().isBlank()) {
                    throw new BusinessException("Reset your password to verify email ownership before linking Google.");
                }
            } else {
                user = User.builder()
                        .email(email)
                        .emailVerified(true)
                        .passwordHash("")
                        .role(UserRole.USER)
                        .status(UserStatus.ACTIVE)
                        .build();
                user = userRepository.save(user);

                UserProfile userProfile = UserProfile.builder()
                        .user(user)
                        .fullName(fullName)
                        .avatarUrl(avatarUrl)
                        .build();
                userProfile = userProfileRepository.save(userProfile);
                user.setProfile(userProfile);
                userProfileEventPublisher.publishSnapshotUpsertedAfterCommit(user);

                AccountSetting accountSetting = AccountSetting.builder()
                        .user(user)
                        .theme("light")
                        .language(AccountLanguage.VIETNAMESE.getValue())
                        .timezone("Asia/Ho_Chi_Minh")
                        .build();
                accountSettingRepository.save(accountSetting);
            }

            OAuthAccount oauthAccount = OAuthAccount.builder()
                    .user(user)
                    .provider(provider)
                    .providerUserId(providerUserId)
                    .build();
            oauthAccountRepository.save(oauthAccount);
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(AuthPolicy.GOOGLE_FAILED);
        }
        user.setEmailVerified(true);

        String ipAddress = servlet.getClientIpAddress(request);
        String rawRefreshToken = tokens.createAndSaveRefreshToken(user, request, ipAddress);
        servlet.setRefreshTokenCookie(response, rawRefreshToken);

        return responses.buildLoginResponse(user);
    }
}
