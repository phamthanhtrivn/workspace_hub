package vn.workspacehub.user.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.dto.request.ForgotPasswordRequest;
import vn.workspacehub.user.dto.request.VerifyOtpRequest;
import vn.workspacehub.user.service.EmailVerificationService;

@RestController
@RequestMapping("/api/auth/verification")
@RequiredArgsConstructor
public class EmailVerificationController {
    private final EmailVerificationService verification;
    private final vn.workspacehub.user.service.ClientIpResolver clientIp;

    @PostMapping("/send")
    public ApiResponse<Void> send(@Valid @RequestBody ForgotPasswordRequest body, HttpServletRequest request) {
        verification.send(body.getEmail(), clientIp.resolve(request));
        return ApiResponse.success(null, "If verification is needed, a code will be sent.");
    }

    @PostMapping("/confirm")
    public ApiResponse<Void> confirm(@Valid @RequestBody VerifyOtpRequest body) {
        verification.confirm(body.getEmail(), body.getOtp());
        return ApiResponse.success(null, "Email verified. You can now sign in.");
    }
}
