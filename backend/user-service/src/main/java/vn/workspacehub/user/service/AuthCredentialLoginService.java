package vn.workspacehub.user.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.workspacehub.user.dto.response.LoginResponseDto;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.util.EmailUtils;
import vn.workspacehub.user.common.AuthPolicy;
import jakarta.annotation.PostConstruct;
import java.util.Optional;
import java.util.UUID;

/** Internal collaborator; authentication transactions are owned by the AuthService facade. */
@Service
@RequiredArgsConstructor
public class AuthCredentialLoginService {
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final AuthAttemptLimiter attemptLimiter;
    private final AuthTokenIssuer tokens;
    private final AuthServletAdapter servlet;
    private final AuthResponseMapper responses;
    private String dummyPasswordHash;

    @PostConstruct
    void initializePasswordTiming() {
        dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    public LoginResponseDto login(String email, String password, HttpServletRequest request,
            HttpServletResponse response) {
        email = EmailUtils.normalize(email);
        attemptLimiter.beforeLogin(email);
        Optional<User> candidate = userRepository.findForUpdateByEmail(email);
        String hash = candidate.map(User::getPasswordHash).filter(value -> !value.isBlank()).orElse(dummyPasswordHash);
        boolean passwordMatches = passwordEncoder.matches(password, hash);
        if (candidate.isEmpty() || !passwordMatches || candidate.get().getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(AuthPolicy.INVALID_CREDENTIALS);
        }
        User user = candidate.get();
        attemptLimiter.loginSucceeded(email);

        String ipAddress = servlet.getClientIpAddress(request);

        String rawRefreshToken = tokens.createAndSaveRefreshToken(user, request, ipAddress);
        servlet.setRefreshTokenCookie(response, rawRefreshToken);

        return responses.buildLoginResponse(user);
    }
}
