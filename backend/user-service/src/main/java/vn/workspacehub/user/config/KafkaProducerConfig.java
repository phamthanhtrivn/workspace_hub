package vn.workspacehub.user.config;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JacksonJsonSerializer;
import vn.workspacehub.user.events.UserProfileKafkaProperties;
import vn.workspacehub.user.events.UserProfileSnapshotPayload;
import vn.workspacehub.user.events.DirectMessagePrivacyEvent;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaProducerConfig {

    @Bean
    public KafkaTemplate<String, String> userOutboxKafkaTemplate(
            @Value(UserProfileKafkaProperties.BOOTSTRAP_SERVERS_PROPERTY) String bootstrapServers) {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.ACKS_CONFIG, "all");
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        config.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 5000);
        config.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 15000);
        return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(config));
    }

    @Bean
    public ProducerFactory<String, UserProfileSnapshotPayload> userProfileProducerFactory(
            @Value(UserProfileKafkaProperties.BOOTSTRAP_SERVERS_PROPERTY) String bootstrapServers
    ) {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JacksonJsonSerializer.class);
        config.put(JacksonJsonSerializer.ADD_TYPE_INFO_HEADERS, false);
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, UserProfileSnapshotPayload> userProfileKafkaTemplate(
            ProducerFactory<String, UserProfileSnapshotPayload> userProfileProducerFactory
    ) {
        return new KafkaTemplate<>(userProfileProducerFactory);
    }

    @Bean
    public ProducerFactory<String, DirectMessagePrivacyEvent> directMessagePrivacyProducerFactory(
            @Value(UserProfileKafkaProperties.BOOTSTRAP_SERVERS_PROPERTY) String bootstrapServers
    ) {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JacksonJsonSerializer.class);
        config.put(JacksonJsonSerializer.ADD_TYPE_INFO_HEADERS, false);
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, DirectMessagePrivacyEvent> directMessagePrivacyKafkaTemplate(
            ProducerFactory<String, DirectMessagePrivacyEvent> directMessagePrivacyProducerFactory
    ) {
        return new KafkaTemplate<>(directMessagePrivacyProducerFactory);
    }
}
