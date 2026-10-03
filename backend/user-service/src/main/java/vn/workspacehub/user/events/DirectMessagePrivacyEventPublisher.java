package vn.workspacehub.user.events;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DirectMessagePrivacyEventPublisher {
    public static final String TOPIC = "user-direct-message-settings-events";

    private final KafkaTemplate<String, DirectMessagePrivacyEvent> kafkaTemplate;

    public void publishAfterCommit(UUID userId, boolean allowNewDirectMessages) {
        Runnable publish = () -> kafkaTemplate.send(
                TOPIC,
                userId.toString(),
                new DirectMessagePrivacyEvent(userId, allowNewDirectMessages)
        ).whenComplete((result, error) -> {
            if (error != null) {
                log.error("Failed to publish direct message privacy change for {}", userId, error);
            }
        });

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish.run();
                }
            });
        } else {
            publish.run();
        }
    }
}
