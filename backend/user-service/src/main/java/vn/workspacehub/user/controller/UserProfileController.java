package vn.workspacehub.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.dto.request.UpdateUserProfileRequest;
import vn.workspacehub.user.dto.response.PresignedUrlResponse;
import vn.workspacehub.user.dto.response.UserProfileResponse;
import vn.workspacehub.user.service.UserProfileService;

import java.util.UUID;

@RestController
@RequestMapping("/api/users/me/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(
            @RequestHeader(value = "X-User-Id") UUID userId) {

        UserProfileResponse response = userProfileService.getMyProfile(userId);
        return ResponseEntity.ok(ApiResponse.<UserProfileResponse>builder()
                .success(true)
                .message("Lấy thông tin hồ sơ người dùng thành công")
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
                .message("Cập nhật thông tin hồ sơ người dùng thành công")
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
                .message("Tạo presigned URL thành công")
                .data(response)
                .build());
    }
}
