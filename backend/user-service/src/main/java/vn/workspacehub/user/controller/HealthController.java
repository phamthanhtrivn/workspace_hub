package vn.workspacehub.user.controller;

import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.TimeUnit;

@RestController
public class HealthController {

    private static final String SERVICE_NAME = "user-service";
    private static final List<String> AUTH_SCHEMA_PROBES = List.of(
            "SELECT id, email, email_verified, password_hash, status, role FROM users WHERE false",
            "SELECT id, user_id, token_hash, family_id, rotated_at, expires_at, revoked FROM refresh_tokens WHERE false",
            "SELECT id, user_id, expires_at, consumed_at FROM password_reset_grants WHERE false",
            "SELECT id, user_id, provider, provider_user_id FROM oauth_accounts WHERE false"
    );

    private final DataSource dataSource;
    private final RedisConnectionFactory redisConnectionFactory;
    private final String kafkaBroker;

    public HealthController(
            DataSource dataSource,
            RedisConnectionFactory redisConnectionFactory,
            @Value("${spring.kafka.bootstrap-servers}") String kafkaBroker
    ) {
        this.dataSource = dataSource;
        this.redisConnectionFactory = redisConnectionFactory;
        this.kafkaBroker = kafkaBroker;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return response("ok", List.of());
    }

    @GetMapping("/ready")
    public ResponseEntity<Map<String, Object>> ready() {
        List<Map<String, String>> checks = List.of(
                checkDatabase(),
                checkRedis(),
                checkKafka()
        );
        boolean isReady = checks.stream().allMatch(check -> "ok".equals(check.get("status")));
        Map<String, Object> response = response(isReady ? "ready" : "unready", checks);

        if (!isReady) {
            response.put("message", "Service dependencies are not ready");
        }

        return ResponseEntity
                .status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
                .body(response);
    }

    private Map<String, Object> response(String status, List<Map<String, String>> checks) {
        Map<String, Object> body = new HashMap<>();
        body.put("service", SERVICE_NAME);
        body.put("status", status);
        body.put("checks", checks);
        body.put("timestamp", Instant.now().toString());
        return body;
    }

    private Map<String, String> checkDatabase() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(3)) {
                try (Statement statement = connection.createStatement()) {
                    statement.setQueryTimeout(3);
                    for (String probe : AUTH_SCHEMA_PROBES) {
                        try (var result = statement.executeQuery(probe)) {
                            // Validate mappings without retrieving account or token data.
                        }
                    }
                }
                return ok("database");
            }
            return error("database", "Database connection is invalid");
        } catch (Exception ex) {
            return error("database", ex.getMessage());
        }
    }

    private Map<String, String> checkRedis() {
        try (RedisConnection connection = redisConnectionFactory.getConnection()) {
            String pong = connection.ping();
            if ("PONG".equalsIgnoreCase(pong)) {
                return ok("redis");
            }
            return error("redis", "Unexpected Redis ping response: " + pong);
        } catch (Exception ex) {
            return error("redis", ex.getMessage());
        }
    }

    private Map<String, String> checkKafka() {
        Properties properties = new Properties();
        properties.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaBroker);
        properties.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, "3000");
        properties.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, "3000");

        try (AdminClient adminClient = AdminClient.create(properties)) {
            adminClient.listTopics().names().get(3, TimeUnit.SECONDS);
            return ok("kafka");
        } catch (Exception ex) {
            return error("kafka", ex.getMessage());
        }
    }

    private Map<String, String> ok(String name) {
        Map<String, String> check = new HashMap<>();
        check.put("name", name);
        check.put("status", "ok");
        return check;
    }

    private Map<String, String> error(String name, String message) {
        Map<String, String> check = new HashMap<>();
        check.put("name", name);
        check.put("status", "error");
        check.put("message", "Dependency unavailable");
        return check;
    }
}
