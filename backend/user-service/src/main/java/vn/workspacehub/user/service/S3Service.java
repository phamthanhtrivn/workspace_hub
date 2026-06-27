package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import vn.workspacehub.user.dto.response.PresignedUrlResponse;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3Service {

    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.region}")
    private String region;

    @Value("${aws.s3.endpoint:}")
    private String endpoint;

    @Value("${aws.s3.cloudfront-url:}")
    private String cloudfrontUrl;

    public PresignedUrlResponse generatePresignedUrl(String objectKey, String contentType) {
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(10))
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        String presignedUrl = presignedRequest.url().toString();

        String fileUrl = generateFileUrl(objectKey);

        return PresignedUrlResponse.builder()
                .presignedUrl(presignedUrl)
                .fileUrl(fileUrl)
                .build();
    }

    private String generateFileUrl(String objectKey) {
        if (cloudfrontUrl != null && !cloudfrontUrl.isEmpty()) {
            return cloudfrontUrl.endsWith("/") ? cloudfrontUrl + objectKey : cloudfrontUrl + "/" + objectKey;
        }
        if (endpoint != null && !endpoint.isEmpty()) {
            return endpoint + "/" + bucketName + "/" + objectKey;
        }
        return "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + objectKey;
    }
}
