package vn.workspacehub.user.service;

import java.time.ZoneId;
import vn.workspacehub.user.exception.BusinessException;

public final class AccountTimezone {
    public static final String DEFAULT = "Asia/Ho_Chi_Minh";
    public static final String INVALID_MESSAGE = "Choose a valid IANA timezone";

    private AccountTimezone() {}

    public static String validate(String timezone) {
        if (timezone == null || !ZoneId.getAvailableZoneIds().contains(timezone)) {
            throw new BusinessException(INVALID_MESSAGE);
        }
        return timezone;
    }
}
