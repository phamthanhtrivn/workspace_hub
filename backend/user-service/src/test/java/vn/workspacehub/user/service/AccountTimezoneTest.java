package vn.workspacehub.user.service;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import vn.workspacehub.user.exception.BusinessException;

class AccountTimezoneTest {
    @Test void acceptsVietnamUtcAndDaylightSavingZones() {
        for (String timezone : new String[] {AccountTimezone.DEFAULT, "UTC", "America/New_York", "Asia/Katmandu"}) {
            assertEquals(timezone, AccountTimezone.validate(timezone));
        }
    }

    @Test void rejectsInvalidSettingsInsteadOfPersistingThem() {
        for (String timezone : new String[] {"", "auto", "+7", "Mars/Base", " Asia/Ho_Chi_Minh "}) {
            assertThrows(BusinessException.class, () -> AccountTimezone.validate(timezone));
        }
    }
}
