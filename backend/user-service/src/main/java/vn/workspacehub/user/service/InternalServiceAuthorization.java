package vn.workspacehub.user.service;

import java.util.List;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.workspacehub.user.util.ServiceCredentials;

/** Route scopes are selected by server code, never by a caller identity header. */
@Service
public class InternalServiceAuthorization {
    private static final List<String> SESSION_CALLERS = List.of(
            "PROJECT_TO_USER_KEY", "COMMUNICATION_TO_USER_KEY", "DOCUMENT_TO_USER_KEY",
            "CALENDAR_TO_USER_KEY", "NOTIFICATION_TO_USER_KEY", "AI_TO_USER_KEY");
    private final Environment environment;

    public InternalServiceAuthorization(Environment environment) {
        this.environment = environment;
    }

    public boolean matchesSession(String key) {
        // Evaluate the complete, route-specific set instead of trusting caller labels.
        boolean allowed = false;
        for (String name : SESSION_CALLERS) allowed |= matches(key, name);
        return allowed;
    }

    public boolean matchesPrivacy(String key) {
        return matches(key, "COMMUNICATION_TO_USER_KEY");
    }

    public boolean matchesProfiles(String key) {
        return matches(key, "CALENDAR_TO_USER_KEY");
    }

    private boolean matches(String key, String name) {
        String expected = environment.getProperty(name);
        return expected != null && expected.length() >= 32 && ServiceCredentials.matches(key, expected);
    }

    public void requireSession(String key) {
        if (!matchesSession(key)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    public void requirePrivacy(String key) {
        if (!matchesPrivacy(key)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
}
