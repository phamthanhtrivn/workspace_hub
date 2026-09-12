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
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.TimeUnit;

@RestController
public class HealthController {

    private static final String SERVICE_NAME = "user-service";

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
        check.put("message", message == null || message.isBlank() ? "Unavailable" : message);
        return check;
    }
}
