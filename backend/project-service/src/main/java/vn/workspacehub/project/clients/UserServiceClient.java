package vn.workspacehub.project.clients;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Service
@Slf4j
public class UserServiceClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String userServiceUrl;

    public UserServiceClient(
            @Value("${services.user-service-url:http://localhost:8081}") String userServiceUrl
    ) {
        this.userServiceUrl = removeTrailingSlash(userServiceUrl);
    }

    public UserContact getContact(UUID userId) {
        String url = userServiceUrl + "/api/users/" + userId + "/profile";
        ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
        JsonNode data = response.getBody() == null ? null : response.getBody().path("data");

        String email = textOrNull(data, "email");
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("User has no email address: " + userId);
        }

        return new UserContact(email, textOrNull(data, "fullName"));
    }

    private static String textOrNull(JsonNode node, String field) {
        if (node == null || node.path(field).isMissingNode() || node.path(field).isNull()) {
            return null;
        }
        return node.path(field).asText();
    }

    private static String removeTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    public record UserContact(String email, String fullName) {
    }
}
