package vn.workspacehub.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.dto.request.UserSettingDto;
import vn.workspacehub.user.dto.response.UserSettingsOverviewDto;
import vn.workspacehub.user.service.UserSettingsService;

import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/users/me/settings")
@RequiredArgsConstructor
public class UserSettingsController {

    private final UserSettingsService userSettingsService;

    @GetMapping
    public ResponseEntity<ApiResponse<UserSettingsOverviewDto>> getSettings(
            @RequestHeader("X-User-Id") UUID userId,
            HttpServletRequest request
    ) {
        UserSettingsOverviewDto overview = userSettingsService.getUserSettingsOverview(userId, request);
        return ResponseEntity.ok(ApiResponse.success(overview, "Lấy thông tin cài đặt thành công"));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserSettingDto>> updateSettings(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody UserSettingDto dto
    ) {
        UserSettingDto updatedSettings = userSettingsService.updateUserSettings(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(updatedSettings, "Cập nhật cài đặt thành công"));
    }
}
