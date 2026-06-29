package vn.workspacehub.user.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.dto.request.RevokeSessionRequest;
import vn.workspacehub.user.dto.response.UserSessionResponse;
import vn.workspacehub.user.service.AuthService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;

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
}
