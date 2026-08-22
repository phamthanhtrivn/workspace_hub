package vn.workspacehub.user.enums;

import java.util.Arrays;

public enum AccountLanguage {
    ENGLISH("en"),
    VIETNAMESE("vi");

    private final String value;

    AccountLanguage(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static AccountLanguage fromValue(String value) {
        return Arrays.stream(values())
                .filter(language -> language.value.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported language"));
    }
}
