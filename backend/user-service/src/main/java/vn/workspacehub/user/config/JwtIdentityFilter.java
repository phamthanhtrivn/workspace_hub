package vn.workspacehub.user.config;

import tools.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.workspacehub.user.common.ApiResponse;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.service.JwtService;
import vn.workspacehub.user.util.ServiceCredentials;

import java.io.IOException;
import java.util.Collections;
import java.util.Date;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Establish identity from signed access claims before controllers read identity headers. */
public final class JwtIdentityFilter extends OncePerRequestFilter {
    private static final Set<String> IDENTITY_HEADERS = Set.of(
            "x-user-id", "x-user-email", "x-user-role", "x-user-name", "x-user-avatar");
    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/api/auth/register", "/api/auth/login", "/api/auth/social", "/api/auth/refresh",
            "/api/auth/logout", "/api/auth/forgot-password", "/api/auth/verify-reset-otp", "/api/auth/reset-password");
    private static final int MAX_TOKEN_LENGTH = 16_384;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;
    private final String internalServiceKey;

    public JwtIdentityFilter(JwtService jwtService, ObjectMapper objectMapper, String internalServiceKey) {
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
        this.internalServiceKey = internalServiceKey;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Map<String, String> identity = new LinkedHashMap<>();
        String path = request.getServletPath();
        boolean isPublic = ("GET".equals(request.getMethod()) && Set.of("/health", "/ready").contains(path))
                || ("POST".equals(request.getMethod()) && PUBLIC_AUTH_PATHS.contains(path));
        boolean isInternal = "GET".equals(request.getMethod())
                && (path.matches("/api/users/internal/[^/]+/direct-message-settings")
                    || path.equals("/api/users/profiles/bulk"))
                && ServiceCredentials.matches(request.getHeader("X-Internal-Service-Key"), internalServiceKey);
        if (!isPublic && !isInternal) {
            try {
                String authorization = request.getHeader("Authorization");
                if (authorization == null || !authorization.matches("(?i)^Bearer\\s+[^\\s]+$")
                        || authorization.length() > MAX_TOKEN_LENGTH + 16) {
                    throw new IllegalArgumentException();
                }
                Claims claims = jwtService.extractAccessClaims(authorization.replaceFirst("(?i)^Bearer\\s+", ""));
                String role = claims.get("role", String.class);
                String purpose = claims.get(AuthPolicy.TOKEN_USE_CLAIM, String.class);
                if (claims.getExpiration() == null || !claims.getExpiration().after(new Date())
                        || !("USER".equals(role) || "ADMIN".equals(role))
                        || (purpose != null && !AuthPolicy.ACCESS_TOKEN_USE.equals(purpose))) {
                    throw new IllegalArgumentException();
                }
                String userId = UUID.fromString(claims.getSubject()).toString();
                if (!userId.equalsIgnoreCase(claims.getSubject())) throw new IllegalArgumentException();
                identity.put("x-user-id", userId);
                identity.put("x-user-role", role);
                addClaim(identity, "x-user-email", claims, "email");
                addClaim(identity, "x-user-name", claims, "fullName");
                addClaim(identity, "x-user-avatar", claims, "avatarUrl");
            } catch (RuntimeException invalidToken) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                objectMapper.writeValue(response.getOutputStream(), ApiResponse.fail("A valid access token is required"));
                return;
            }
        }
        chain.doFilter(new IdentityRequest(request, identity), response);
    }

    private static void addClaim(Map<String, String> identity, String header, Claims claims, String claim) {
        String value = claims.get(claim, String.class);
        if (value != null && value.chars().noneMatch(character -> character < 32 || character == 127)) {
            identity.put(header, value);
        }
    }

    private static final class IdentityRequest extends HttpServletRequestWrapper {
        private final Map<String, String> identity;

        private IdentityRequest(HttpServletRequest request, Map<String, String> identity) {
            super(request);
            this.identity = identity;
        }

        @Override
        public String getHeader(String name) {
            String normalized = name.toLowerCase(Locale.ROOT);
            return IDENTITY_HEADERS.contains(normalized) ? identity.get(normalized) : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (IDENTITY_HEADERS.contains(name.toLowerCase(Locale.ROOT))) {
                String value = getHeader(name);
                return Collections.enumeration(value == null ? Collections.emptyList() : Collections.singletonList(value));
            }
            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            Set<String> names = new LinkedHashSet<>(Collections.list(super.getHeaderNames()));
            names.removeIf(name -> IDENTITY_HEADERS.contains(name.toLowerCase(Locale.ROOT)));
            names.addAll(identity.keySet());
            return Collections.enumeration(names);
        }
    }
}
