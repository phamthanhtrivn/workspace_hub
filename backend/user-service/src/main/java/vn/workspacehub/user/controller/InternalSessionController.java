package vn.workspacehub.user.controller;

import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.workspacehub.user.service.SessionAuthorizationService;
import vn.workspacehub.user.util.ServiceCredentials;

@RestController
@RequestMapping("/api/users/internal/sessions")
@RequiredArgsConstructor
public class InternalSessionController {
    private final SessionAuthorizationService sessions;
    @Value("${INTERNAL_SERVICE_KEY:}") private String serviceKey;
    public record SessionRequest(@NotNull UUID userId, @NotNull UUID sessionId) {}
    public record SessionResult(boolean active) {}

    @PostMapping("/authorize")
    public SessionResult authorize(@RequestHeader(value = "X-Internal-Service-Key", required = false) String key,
            @Valid @RequestBody SessionRequest request) {
        if (!ServiceCredentials.matches(key, serviceKey)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return new SessionResult(sessions.isActive(request.userId(), request.sessionId()));
    }
}
