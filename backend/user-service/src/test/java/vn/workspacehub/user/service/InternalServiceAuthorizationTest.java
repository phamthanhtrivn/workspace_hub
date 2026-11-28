package vn.workspacehub.user.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;

class InternalServiceAuthorizationTest {
    @Test
    void sessionKeysDoNotGrantPrivacyOrProfileScopes() {
        String project = "p".repeat(64), communication = "c".repeat(64), calendar = "a".repeat(64);
        var environment = new MockEnvironment()
                .withProperty("PROJECT_TO_USER_KEY", project)
                .withProperty("COMMUNICATION_TO_USER_KEY", communication)
                .withProperty("CALENDAR_TO_USER_KEY", calendar)
                .withProperty("INTERNAL_SERVICE_KEY", "legacy".repeat(10));
        var authorization = new InternalServiceAuthorization(environment);
        assertTrue(authorization.matchesSession(project));
        assertTrue(authorization.matchesSession(communication));
        assertTrue(authorization.matchesSession(calendar));
        assertFalse(authorization.matchesPrivacy(project));
        assertFalse(authorization.matchesProfiles(project));
        assertTrue(authorization.matchesPrivacy(communication));
        assertTrue(authorization.matchesProfiles(calendar));
        assertFalse(authorization.matchesPrivacy(calendar));
        assertFalse(authorization.matchesProfiles(communication));
        assertFalse(authorization.matchesSession("legacy".repeat(10)));
        assertFalse(authorization.matchesSession(null));
        assertFalse(authorization.matchesSession(""));
        assertFalse(authorization.matchesSession(project + "x"));
    }

    @Test
    void unsetOrWeakConfigurationNeverAuthenticates() {
        var authorization = new InternalServiceAuthorization(new MockEnvironment().withProperty("PROJECT_TO_USER_KEY", "weak"));
        assertFalse(authorization.matchesSession("weak"));
        assertThrows(RuntimeException.class, () -> authorization.requireSession("weak"));
        assertThrows(RuntimeException.class, () -> authorization.requirePrivacy("anything"));
    }
}
