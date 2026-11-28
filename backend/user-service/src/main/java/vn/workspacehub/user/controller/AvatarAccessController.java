package vn.workspacehub.user.controller;

import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.service.AvatarUploadService;
import vn.workspacehub.user.service.AvatarStorageKeys;
import vn.workspacehub.user.dto.response.StorageAccessResponse;

@RestController
@RequestMapping(AvatarStorageKeys.API_PATH)
@RequiredArgsConstructor
public class AvatarAccessController {
    private final AvatarUploadService avatars;

    @GetMapping("/{userId}/{fileName}")
    public ResponseEntity<ApiResponse<StorageAccessResponse>> access(
            @RequestHeader("X-User-Id") UUID actorId, @PathVariable UUID userId, @PathVariable String fileName) {
        String url = avatars.authorizeRead(actorId, userId, fileName);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.<StorageAccessResponse>builder().success(true)
                        .data(new StorageAccessResponse(url, Instant.now().plusSeconds(AvatarStorageKeys.READ_TTL_SECONDS).toString())).build());
    }
}
