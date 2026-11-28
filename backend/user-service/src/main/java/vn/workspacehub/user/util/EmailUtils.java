package vn.workspacehub.user.util;

import java.util.Locale;

public final class EmailUtils {
    private EmailUtils() {}

    public static String normalize(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }
}
