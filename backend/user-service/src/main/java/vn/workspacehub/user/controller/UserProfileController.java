package vn.workspacehub.user.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.dto.request.SetFirstPasswordRequest;
import vn.workspacehub.user.dto.request.UpdatePasswordRequest;
import vn.workspacehub.user.dto.request.UpdateUserProfileRequest;
import vn.workspacehub.user.dto.response.PresignedUrlResponse;
import vn.workspacehub.user.dto.response.UserProfileResponse;
import vn.workspacehub.user.service.UserProfileService;
import vn.workspacehub.user.util.CookieUtils;
import vn.workspacehub.user.util.HashUtils;

import java.util.UUID;

@RestController
@RequestMapping("/api/users/me/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @Value("${jwt.secret_key}")
    private String jwtSecret;

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    @GetMapping
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(
            @RequestHeader(value = "X-User-Id") UUID userId) {

        UserProfileResponse response = userProfileService.getMyProfile(userId);
        return ResponseEntity.ok(ApiResponse.<UserProfileResponse>builder()
                .success(true)
                .message("User profile retrieved successfully")
                .data(response)
                .build());
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            @RequestHeader(value = "X-User-Id") UUID userId,
            @Valid @RequestBody UpdateUserProfileRequest request) {

        UserProfileResponse response = userProfileService.updateMyProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.<UserProfileResponse>builder()
                .success(true)
                .message("User profile updated successfully")
                .data(response)
                .build());
    }

    @GetMapping("/avatar/presigned-url")
    public ResponseEntity<ApiResponse<PresignedUrlResponse>> getAvatarPresignedUrl(
            @RequestHeader(value = "X-User-Id") UUID userId,
            @RequestParam("fileName") String fileName,
            @RequestParam("contentType") String contentType) {

        PresignedUrlResponse response = userProfileService.generateAvatarPresignedUrl(userId, fileName, contentType);

        return ResponseEntity.ok(ApiResponse.<PresignedUrlResponse>builder()
                .success(true)
                .message("Presigned URL generated successfully")
                .data(response)
                .build());
    }

    @PostMapping("/password/send-otp")
    public ResponseEntity<ApiResponse<Void>> sendPasswordOtp(
            @RequestHeader(value = "X-User-Id") UUID userId) {

        userProfileService.sendPasswordOtp(userId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("OTP sent successfully")
                .build());
    }

    @PatchMapping("/password/set")
    public ResponseEntity<ApiResponse<Void>> setFirstPassword(
            @RequestHeader(value = "X-User-Id") UUID userId,
            @Valid @RequestBody SetFirstPasswordRequest request,
            HttpServletRequest httpRequest) {

        String rawToken = CookieUtils.extractCookie(httpRequest, REFRESH_TOKEN_COOKIE);
        String currentTokenHash = (rawToken != null && !rawToken.isBlank())
                ? HashUtils.hmacSha256(rawToken, jwtSecret)
                : null;

        userProfileService.setFirstPassword(userId, request, currentTokenHash);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Password set successfully")
                .build());
    }

    @PatchMapping("/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @RequestHeader(value = "X-User-Id") UUID userId,
            @Valid @RequestBody UpdatePasswordRequest request,
            HttpServletRequest httpRequest) {

        String rawToken = CookieUtils.extractCookie(httpRequest, REFRESH_TOKEN_COOKIE);
        String currentTokenHash = (rawToken != null && !rawToken.isBlank())
                ? HashUtils.hmacSha256(rawToken, jwtSecret)
                : null;

        userProfileService.updatePassword(userId, request, currentTokenHash);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Password updated successfully")
                .build());
    }
}
