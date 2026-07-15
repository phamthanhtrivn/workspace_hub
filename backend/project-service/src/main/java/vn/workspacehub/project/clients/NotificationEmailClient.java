package vn.workspacehub.project.clients;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import vn.workspacehub.project.entity.Project;
import vn.workspacehub.project.entity.ProjectInvitation;

@Service
@Slf4j
public class NotificationEmailClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String notificationServiceUrl;
    private final String internalServiceKey;
    private final String frontendUrl;

    public NotificationEmailClient(
            @Value("${services.notification-service-url:http://localhost:8084}") String notificationServiceUrl,
            @Value("${services.internal-service-key:}") String internalServiceKey,
            @Value("${services.frontend-url:http://localhost:3000}") String frontendUrl
    ) {
        this.notificationServiceUrl = removeTrailingSlash(notificationServiceUrl);
        this.internalServiceKey = internalServiceKey;
        this.frontendUrl = removeTrailingSlash(frontendUrl);
    }

    public void sendProjectInvitationEmail(
            ProjectInvitation invitation,
            Project project,
            UserServiceClient.UserContact recipient,
            UserServiceClient.UserContact inviter
    ) {
        if (internalServiceKey == null || internalServiceKey.isBlank()) {
            throw new IllegalStateException("services.internal-service-key is not configured");
        }

        ProjectInvitationEmailRequest request = new ProjectInvitationEmailRequest(
                recipient.email(),
                recipient.fullName(),
                project.getName(),
                inviter.fullName(),
                invitation.getId().toString(),
                frontendUrl + "/invitations",
                invitation.getExpiresAt() == null ? null : invitation.getExpiresAt().toString()
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-internal-service-key", internalServiceKey);

        String url = notificationServiceUrl + "/api/notifications/project-invitations/email";
        restTemplate.postForEntity(url, new HttpEntity<>(request, headers), Void.class);
    }

    private static String removeTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private record ProjectInvitationEmailRequest(
            String recipientEmail,
            String recipientName,
            String projectName,
            String inviterName,
            String invitationId,
            String acceptUrl,
            String expiresAt
    ) {
    }
}
