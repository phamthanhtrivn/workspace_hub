package vn.workspacehub.user.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import java.net.URI;

@Configuration
public class S3Config {

    @Value("${aws.s3.region}")
    private String region;

    @Value("${aws.s3.access-key}")
    private String accessKey;

    @Value("${aws.s3.secret-key}")
    private String secretKey;

    @Bean
    public software.amazon.awssdk.services.s3.S3Client s3Client() {
        return software.amazon.awssdk.services.s3.S3Client.builder().region(Region.of(region))
                .credentialsProvider(accessKey.isBlank() && secretKey.isBlank()
                    ? DefaultCredentialsProvider.builder().build()
                    : StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey))).build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        S3Presigner.Builder builder = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(accessKey.isBlank() && secretKey.isBlank()
                        ? DefaultCredentialsProvider.builder().build()
                        : StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)));

        return builder.build();
    }
}
