package vn.workspacehub.user.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public final class ServiceCredentials {
    private ServiceCredentials() {}

    public static boolean matches(String supplied, String expected) {
        return supplied != null && !supplied.isEmpty() && expected != null && !expected.isBlank()
                && MessageDigest.isEqual(supplied.getBytes(StandardCharsets.UTF_8), expected.getBytes(StandardCharsets.UTF_8));
    }
}
