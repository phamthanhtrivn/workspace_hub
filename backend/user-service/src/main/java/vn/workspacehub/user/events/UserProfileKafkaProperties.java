package vn.workspacehub.user.events;

public final class UserProfileKafkaProperties {
    public static final String BOOTSTRAP_SERVERS_PROPERTY = "${spring.kafka.bootstrap-servers:localhost:9092}";

    private UserProfileKafkaProperties() {
    }
}
