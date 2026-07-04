package vn.workspacehub.user.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.dto.request.RevokeSessionRequest;
import vn.workspacehub.user.dto.response.AccountSettingResponse;
import vn.workspacehub.user.dto.response.UserSessionResponse;
import vn.workspacehub.user.dto.response.UserSearchResponse;
import vn.workspacehub.user.dto.response.UserProfileResponse;
import vn.workspacehub.user.service.AuthService;
import vn.workspacehub.user.service.UserService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;
    private final UserService userService;

    @GetMapping("/me/sessions")
    public ResponseEntity<ApiResponse<List<UserSessionResponse>>> getActiveSessions(
            @RequestHeader(value = "X-User-Id") UUID userId,
            HttpServletRequest request) {

        List<UserSessionResponse> sessions = authService.getActiveSessions(userId, request);
        return ResponseEntity.ok(ApiResponse.<List<UserSessionResponse>>builder()
                .success(true)
                .message("Lấy danh sách phiên đăng nhập thành công")
                .data(sessions)
                .build());
    }

    @DeleteMapping("/me/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> revokeSession(
            @RequestHeader(value = "X-User-Id") UUID userId,
            @PathVariable UUID sessionId,
            @Valid @RequestBody RevokeSessionRequest revokeRequest) {

        authService.revokeSession(userId, sessionId, revokeRequest.getPassword());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Đăng xuất thiết bị thành công")
                .build());
    }

    @GetMapping("/me/settings")
    public ResponseEntity<ApiResponse<AccountSettingResponse>> getAccountSettings(
            @RequestHeader(value = "X-User-Id") UUID userId) {

        AccountSettingResponse settings = userService.getAccountSettings(userId);
        return ResponseEntity.ok(ApiResponse.<AccountSettingResponse>builder()
                .success(true)
                .message("Lấy thông tin cài đặt thành công")
                .data(settings)
                .build());
    }

    @PutMapping("/me/settings/privacy")
    public ResponseEntity<ApiResponse<Void>> updatePrivacySettings(
            @RequestHeader(value = "X-User-Id") UUID userId,
            @RequestBody vn.workspacehub.user.dto.request.UpdatePrivacyRequest request) {
        
        userService.updatePrivacySettings(userId, request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Cập nhật cài đặt riêng tư thành công")
                .build());
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<UserSearchResponse>>> searchUserByEmail(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam String email) {

        List<UserSearchResponse> users = userService.searchUserByEmail(userId, email);
        return ResponseEntity.ok(ApiResponse.<List<UserSearchResponse>>builder()
                .success(true)
                .message("Tìm kiếm người dùng thành công")
                .data(users)
                .build());
    }

    @GetMapping("/{id}/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getPublicProfile(
            @PathVariable UUID id) {
        
        UserProfileResponse profile = userService.getPublicProfile(id);
        return ResponseEntity.ok(ApiResponse.<UserProfileResponse>builder()
                .success(true)
                .message("Lấy thông tin người dùng thành công")
                .data(profile)
                .build());
    }
}
