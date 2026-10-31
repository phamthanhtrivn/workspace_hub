package vn.workspacehub.user.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.workspacehub.user.common.AuthPolicy;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.util.EmailUtils;

@Component
public class GoogleIdentityVerifier {
    private final String clientId;
    private final GoogleIdTokenVerifier verifier;

    public record Identity(String subject, String email, String fullName, String avatarUrl) {}

    public GoogleIdentityVerifier(@Value("${spring.security.oauth2.client.registration.google.client-id:}") String clientId) {
        this.clientId = clientId;
        verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(List.of(clientId)).build();
    }

    public Identity verify(String credential) {
        try {
            if (clientId.isBlank()) throw new IllegalArgumentException();
            // Google's verifier checks signature, issuer, audience and token lifetime, caching public certificates.
            GoogleIdToken token = verifier.verify(credential);
            if (token == null) throw new IllegalArgumentException();
            GoogleIdToken.Payload payload = token.getPayload();
            if (!Boolean.TRUE.equals(payload.getEmailVerified()) || payload.getSubject() == null
                    || payload.getSubject().isBlank() || payload.getEmail() == null || payload.getEmail().isBlank())
                throw new IllegalArgumentException();
            return new Identity(payload.getSubject(), EmailUtils.normalize(payload.getEmail()),
                    text(payload.get("name")), text(payload.get("picture")));
        } catch (Exception rejected) {
            // Never expose credentials, provider bodies or Java exception names to the caller.
            throw new BusinessException(AuthPolicy.GOOGLE_FAILED);
        }
    }

    private String text(Object value) {
        return value instanceof String text ? text : null;
    }
}
