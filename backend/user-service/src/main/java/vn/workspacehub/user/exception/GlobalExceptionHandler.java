package vn.workspacehub.user.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import vn.workspacehub.user.common.ApiResponse;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<?>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(404).body(ApiResponse.builder()
                .success(false).message(ex.getMessage()).errors(null)
                .timestamp(LocalDateTime.now()).build());
    }

    @ExceptionHandler(AuthRateLimitException.class)
    public ResponseEntity<ApiResponse<?>> handleAuthRateLimit(AuthRateLimitException ex) {
        return ResponseEntity.status(429).header("Retry-After", Integer.toString(vn.workspacehub.user.common.AuthPolicy.LOGIN_WINDOW_SECONDS))
                .body(ApiResponse.builder().success(false).message(ex.getMessage())
                        .timestamp(LocalDateTime.now()).build());
    }

     @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult().getFieldErrors().forEach(error -> {
            errors.put(error.getField(), error.getDefaultMessage());
        });

        ApiResponse<?> response = ApiResponse.builder()
                .success(false)
                .message("Validation failed")
                .errors(errors)
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<?>> handleRuntime(BusinessException ex) {

        ApiResponse<?> response = ApiResponse.builder()
                .success(false)
                .message(ex.getMessage())
                .errors(null)
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.badRequest().body(response);
    }
}
