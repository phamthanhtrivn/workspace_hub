package vn.workspacehub.user.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.CookieValue;
import java.util.Map;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.dto.request.LoginRequestDto;
import vn.workspacehub.user.dto.request.RegisterRequestDto;
import vn.workspacehub.user.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequestDto request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Đăng ký tài khoản thành công"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<?>> login(
            @Valid @RequestBody LoginRequestDto loginRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        var loginResponse = authService.login(loginRequest.getEmail(), loginRequest.getPassword(), request, response);
        return ResponseEntity.ok(ApiResponse.success(loginResponse, "Đăng nhập thành công"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<?>> refresh(HttpServletRequest request, HttpServletResponse response) {
        var refreshResponse = authService.refresh(request, response);
        return ResponseEntity.ok(ApiResponse.success(refreshResponse, "Làm mới token thành công"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<?>> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(request, response);
        return ResponseEntity.ok(ApiResponse.success(null, "Đăng xuất thành công"));
    }

    @GetMapping("/session")
    public ResponseEntity<?> checkSession(
            @CookieValue(name = "refreshToken", required = false)
            String refreshToken
    ) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
        return ResponseEntity.ok(Map.of("authenticated", true));
    }
}


