package vn.workspacehub.user.events;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DirectMessagePrivacyEvent {
    private UUID userId;
    private boolean allowNewDirectMessages;
}
