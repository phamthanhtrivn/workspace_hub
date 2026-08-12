package vn.workspacehub.user.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.dto.request.*;
import vn.workspacehub.user.service.AuthService;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final vn.workspacehub.user.service.PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequestDto request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Account registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<?>> login(
            @Valid @RequestBody LoginRequestDto loginRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        var loginResponse = authService.login(loginRequest.getEmail(), loginRequest.getPassword(), request, response);
        return ResponseEntity.ok(ApiResponse.success(loginResponse, "Signed in successfully"));
    }

    @PostMapping("/social")
    public ResponseEntity<ApiResponse<?>> socialLogin(
            @Valid @RequestBody SocialLoginRequestDto requestDto,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        var loginResponse = authService.socialLogin(requestDto.getProvider(), requestDto.getCredential(), request, response);
        return ResponseEntity.ok(ApiResponse.success(loginResponse, "Social sign-in successful"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<?>> refresh(HttpServletRequest request, HttpServletResponse response) {
        var refreshResponse = authService.refresh(request, response);
        if (refreshResponse == null) {
            return ResponseEntity.ok(ApiResponse.success(null, "Not signed in"));
        }
        return ResponseEntity.ok(ApiResponse.success(refreshResponse, "Token refreshed successfully"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<?>> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(request, response);
        return ResponseEntity.ok(ApiResponse.success(null, "Signed out successfully"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<?>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestForgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null, "An OTP has been sent to your email"));
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<ApiResponse<?>> verifyResetOtp(@Valid @RequestBody VerifyOtpRequest request) {
        String resetToken = passwordResetService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success(Map.of("resetToken", resetToken), "OTP verified successfully"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<?>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password updated successfully"));
    }
}
