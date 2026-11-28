package vn.workspacehub.user.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.dto.request.RegisterRequestDto;
import vn.workspacehub.user.dto.response.LoginResponseDto;
import vn.workspacehub.user.dto.response.UserSessionResponse;
import vn.workspacehub.user.enums.OAuthProvider;
import vn.workspacehub.user.exception.BusinessException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthCredentialLoginService credentials;
    private final AuthSocialLoginService social;
    private final AuthRegistrationService registration;
    private final AuthRefreshService refreshFlow;
    private final AuthSessionService sessions;

    @Transactional
    public LoginResponseDto login(String email, String password, HttpServletRequest request,
            HttpServletResponse response) {
        return credentials.login(email, password, request, response);
    }

    @Transactional
    public LoginResponseDto socialLogin(OAuthProvider provider, String credential, HttpServletRequest request,
            HttpServletResponse response) {
        return social.socialLogin(provider, credential, request, response);
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public LoginResponseDto refresh(HttpServletRequest request, HttpServletResponse response) {
        return refreshFlow.refresh(request, response);
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        sessions.logout(request, response);
    }

    @Transactional
    public void register(RegisterRequestDto dto) {
        registration.register(dto);
    }

    @Transactional(readOnly = true)
    public List<UserSessionResponse> getActiveSessions(UUID userId, HttpServletRequest request) {
        return sessions.getActiveSessions(userId, request);
    }

    @Transactional
    public void revokeSession(UUID userId, UUID sessionId, String password) {
        sessions.revokeSession(userId, sessionId, password);
    }
}
