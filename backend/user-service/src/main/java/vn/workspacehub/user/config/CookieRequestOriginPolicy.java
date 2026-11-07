package vn.workspacehub.user.config;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.Locale;
import java.util.Set;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.util.CookieUtils;

/** Browser cookie operations need an origin check independently of CORS. */
public final class CookieRequestOriginPolicy {
    private static final Set<String> COOKIE_PATHS = Set.of(AuthPolicy.REFRESH_PATH, AuthPolicy.LOGOUT_PATH);
    private final String frontendOrigin;

    public CookieRequestOriginPolicy(String frontendUrl) {
        frontendOrigin = origin(frontendUrl, false);
    }

    public boolean allows(HttpServletRequest request) {
        if (!"POST".equals(request.getMethod()) || !COOKIE_PATHS.contains(request.getServletPath())
                || CookieUtils.extractCookie(request, AuthPolicy.REFRESH_COOKIE) == null) return true;
        String declaredOrigin = request.getHeader("Origin");
        if (declaredOrigin != null) return matches(origin(declaredOrigin, false));
        String referer = request.getHeader("Referer");
        if (referer != null) return matches(origin(referer, true));
        // Browser requests with Fetch Metadata must not silently fall back to
        // native-client behavior when their origin/referrer has been stripped.
        return request.getHeader("Sec-Fetch-Site") == null;
    }

    private boolean matches(String supplied) {
        return frontendOrigin != null && frontendOrigin.equals(supplied);
    }

    private static String origin(String value, boolean allowPath) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null || uri.getUserInfo() != null
                    || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) return null;
            if (!allowPath && ((uri.getRawPath() != null && !uri.getRawPath().isEmpty() && !uri.getRawPath().equals("/"))
                    || uri.getRawQuery() != null || uri.getRawFragment() != null)) return null;
            int port = uri.getPort();
            if (port < -1 || port > 65535 || port == 0) return null;
            if (port == -1) port = scheme.equalsIgnoreCase("https") ? 443 : 80;
            return scheme.toLowerCase(Locale.ROOT) + "://" + host.toLowerCase(Locale.ROOT) + ":" + port;
        } catch (RuntimeException invalid) {
            return null;
        }
    }
}
