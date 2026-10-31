package vn.workspacehub.user.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.nio.charset.StandardCharsets;
import vn.workspacehub.user.common.AuthPolicy;

public class PasswordBytesValidator implements ConstraintValidator<PasswordBytes, String> {
    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= AuthPolicy.MAX_PASSWORD_BYTES;
    }
}
