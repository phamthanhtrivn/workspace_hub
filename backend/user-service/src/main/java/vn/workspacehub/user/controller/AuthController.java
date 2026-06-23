package vn.workspacehub.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.dto.request.RegisterRequestDto;
import vn.workspacehub.user.service.UserService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequestDto request) {
        userService.register(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Đăng ký tài khoản thành công"));
    }
}
