# Kong Gateway Custom Authentication Architecture

This directory contains the production-ready Kong Gateway configuration, designed specifically for the Workspace Hub microservices architecture.

## Overview

Instead of each microservice decoding and verifying JWT tokens (which creates redundant code and security risks), the API Gateway handles authentication.

The architecture flows as follows:

1. **Client** sends request with `Authorization: Bearer <token>`.
2. **Kong Gateway** intercepts the request.
3. The official **Kong JWT Plugin** verifies the token signature (`HS256`). If invalid/expired, returns `401`.
4. Our custom **jwt-user-context** plugin runs. It:
   - Safely parses the JWT payload using `cjson.safe`.
   - Extracts `sub` (userId), `email`, and `role`.
   - Strips any existing `X-User-*` headers from the client to prevent spoofing.
   - Injects the verified data into `X-User-Id`, `X-User-Email`, and `X-User-Role` headers.
5. **Upstream Microservice** receives the request and reads the headers.

## Folder Structure

```text
backend/kong-gateway/
├── plugins/
│   └── jwt-user-context/
│       ├── handler.lua     # Logic for extracting and injecting headers safely
│       └── schema.lua      # Plugin configuration definition
├── kong.yml                # Kong declarative configuration v3
├── Dockerfile              # Builds a custom Kong image containing the Lua plugin
└── README.md               # This documentation
```

## Spring Boot Integration

Your Spring Boot microservices should **never** parse or verify JWTs again. They should simply trust the `X-User-*` headers provided by Kong.

### Example 1: Direct Header Injection in Controllers

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/me")
    public UserResponse me(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        // You now have the user's identity securely. No JWT parsing required!
        return userService.getUserProfile(userId);
    }
}
```

### Example 2: Clean Architecture using HandlerMethodArgumentResolver (Recommended)

To avoid polluting all controllers with `@RequestHeader`, you can create a custom annotation `@CurrentUser` and an argument resolver:

```java
// 1. Annotation
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {}

// 2. DTO
public record UserContext(UUID id, String email, String role) {}

// 3. Resolver
@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class)
            && parameter.getParameterType().equals(UserContext.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {

        String idStr = webRequest.getHeader("X-User-Id");
        if (idStr == null) throw new UnauthorizedException(); // Should theoretically never happen if Kong is configured

        return new UserContext(
            UUID.fromString(idStr),
            webRequest.getHeader("X-User-Email"),
            webRequest.getHeader("X-User-Role")
        );
    }
}

// 4. Usage in Controller
@GetMapping("/me")
public UserResponse me(@CurrentUser UserContext user) {
    return userService.getUserProfile(user.id());
}
```

## Deployment Steps

To deploy this architecture locally or on a server:

1. Ensure your `.env` file inside `kong-gateway` has `$FRONTEND_URL` and `$JWT_SECRET_KEY` correctly set.
2. Navigate to your docker directory: `cd backend/docker`
3. Force rebuild the Kong container to compile the new plugin:

   ```bash
   docker-compose up -d --build kong
   ```

4. Verify Kong is running and the custom plugin is loaded:

   ```bash
   docker logs workspace_hub_kong
   ```

## Security Considerations

1. **Header Spoofing**: The `jwt-user-context` plugin uses `kong.service.request.clear_header` to strip any `X-User-*` headers that a malicious client might try to send directly. The microservices can trust these headers _because they are only ever set by Kong_.
2. **Network Isolation**: Ensure your Spring Boot services (`user-service`, `project-service`) are NOT exposed directly to the public internet (do not map their ports like `8081:8081` in docker-compose for production). They should only be accessible through Kong's network.
3. **CJSON Safety**: The Lua plugin uses `cjson.safe` instead of standard regex matching to prevent payload injection attacks or crashes on malformed JSON.

## Future Scalability Recommendations

1. **Database-backed Kong**: If you move to a multi-node Kong cluster, consider migrating from DB-less (Declarative Config) to a PostgreSQL-backed Kong setup for dynamic configuration updates without reloading the container.
2. **OIDC Integration**: The architecture allows easy swapping of JWT verification with OIDC (e.g., Keycloak) in the future, as the microservices only rely on the standard headers (`X-User-Id`), abstracting away the auth provider.
