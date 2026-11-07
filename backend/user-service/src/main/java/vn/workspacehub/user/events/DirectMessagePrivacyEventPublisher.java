package vn.workspacehub.user.events;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DirectMessagePrivacyEventPublisher {
    public static final String TOPIC = "user-direct-message-settings-events";

    private final UserEventOutbox outbox;

    public void enqueue(UUID userId, boolean allowNewDirectMessages) {
        outbox.enqueue(TOPIC, userId, new DirectMessagePrivacyEvent(userId, allowNewDirectMessages));
    }
}
