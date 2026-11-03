package vn.workspacehub.user.controller;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
import vn.workspacehub.user.common.AuthPolicy;

import java.util.UUID;

@RestController
@RequestMapping("/api/users/me/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final vn.workspacehub.user.service.AvatarUploadService avatars;

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
            @RequestParam("contentType") String contentType, @RequestParam("sizeBytes") long sizeBytes) {

        PresignedUrlResponse response = userProfileService.generateAvatarPresignedUrl(userId, fileName, contentType, sizeBytes);

        return ResponseEntity.ok(ApiResponse.<PresignedUrlResponse>builder()
                .success(true)
                .message("Presigned URL generated successfully")
                .data(response)
                .build());
    }

    public record ConfirmAvatarRequest(@jakarta.validation.constraints.NotNull UUID uploadId) {}

    @PostMapping("/avatar/confirm")
    public ApiResponse<java.util.Map<String, String>> confirmAvatar(@RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody ConfirmAvatarRequest request) {
        return ApiResponse.success(java.util.Map.of("fileUrl", avatars.confirm(userId, request.uploadId())), "Avatar verified");
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
            HttpServletResponse httpResponse) {
        userProfileService.setFirstPassword(userId, request);
        CookieUtils.clearCookie(httpResponse, AuthPolicy.REFRESH_COOKIE, "/");
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Password set successfully")
                .build());
    }

    @PatchMapping("/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @RequestHeader(value = "X-User-Id") UUID userId,
            @Valid @RequestBody UpdatePasswordRequest request,
            HttpServletResponse httpResponse) {
        userProfileService.updatePassword(userId, request);
        CookieUtils.clearCookie(httpResponse, AuthPolicy.REFRESH_COOKIE, "/");
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Password updated successfully")
                .build());
    }
}
