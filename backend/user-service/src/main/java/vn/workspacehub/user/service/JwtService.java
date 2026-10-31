package vn.workspacehub.user.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import vn.workspacehub.user.common.AuthPolicy;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long accessTokenExpiration;
    private final String issuer;

    public JwtService(
            @Value("${jwt.secret_key}") String secret,
            @Value("${jwt.access-token-expiration}") long accessTokenExpiration,
            @Value("${jwt.issuer}") String issuer
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiration = accessTokenExpiration;
        this.issuer = issuer;
    }

    public String generateAccessToken(UUID userId, String email, String role, String fullName, String avatarUrl) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessTokenExpiration);

        return Jwts.builder()
                .issuer(issuer)
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role)
                .claim(AuthPolicy.TOKEN_USE_CLAIM, AuthPolicy.ACCESS_TOKEN_USE)
                .claim("fullName", fullName)
                .claim("avatarUrl", avatarUrl)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Claims extractAccessClaims(String token) {
        var parsed = Jwts.parser().verifyWith(secretKey).requireIssuer(issuer).build().parseSignedClaims(token);
        if (!"HS256".equals(parsed.getHeader().getAlgorithm())) {
            throw new IllegalArgumentException("Invalid access token");
        }
        return parsed.getPayload();
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).get("email", String.class);
    }

    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    public Date extractExpiration(String token) {
        return extractAllClaims(token).getExpiration();
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public String generateResetToken(UUID userId, String email) {
        Date now = new Date();
        // 15 phút (15 * 60 * 1000)
        Date expiry = new Date(now.getTime() + AuthPolicy.RESET_TTL_SECONDS * 1000L);

        return Jwts.builder()
                .issuer(issuer)
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", "RESET_PASSWORD_ROLE")
                .id(UUID.randomUUID().toString())
                .audience().add(AuthPolicy.RESET_AUDIENCE).and()
                .claim(AuthPolicy.TOKEN_USE_CLAIM, AuthPolicy.RESET_TOKEN_USE)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    public Claims extractResetClaims(String token) {
        Claims claims = extractAllClaims(token);
        if (!AuthPolicy.RESET_ROLE.equals(claims.get("role", String.class))
                || !AuthPolicy.RESET_TOKEN_USE.equals(claims.get(AuthPolicy.TOKEN_USE_CLAIM, String.class))
                || claims.getAudience() == null || !claims.getAudience().contains(AuthPolicy.RESET_AUDIENCE)
                || claims.getExpiration() == null || !claims.getExpiration().after(new Date())) {
            throw new IllegalArgumentException(AuthPolicy.INVALID_RESET);
        }
        UUID.fromString(claims.getId());
        UUID.fromString(claims.getSubject());
        return claims;
    }
}
