package vn.workspacehub.user.service;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;

@Component
public class ClientIpResolver {
    private static final int MAX_PROXY_HOPS = 64;
    private final List<IpAddressMatcher> trustedProxies;

    public ClientIpResolver(@Value("${auth.trusted-proxy-cidrs:${TRUSTED_PROXY_CIDRS:}}") String configured) {
        trustedProxies = Arrays.stream(configured.split(",")).map(String::strip).filter(value -> !value.isEmpty())
                .map(value -> {
                    String address = value.split("/", 2)[0];
                    if (!literal(address)) throw new IllegalArgumentException("Trusted proxies must be IP addresses or CIDRs");
                    return new IpAddressMatcher(value);
                }).toList();
    }

    public String resolve(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (!trusted(remote) || forwarded == null || forwarded.isBlank()) return remote;
        String[] hops = forwarded.split(",", -1);
        if (hops.length > MAX_PROXY_HOPS) return remote;
        String candidate = remote;
        for (int index = hops.length - 1; index >= 0 && trusted(candidate); index--) {
            String next = hops[index].strip();
            if (!literal(next)) return remote;
            try {
                new IpAddressMatcher(next); // Validate the literal without accepting DNS names.
            } catch (IllegalArgumentException invalid) {
                return remote;
            }
            candidate = next;
        }
        return candidate;
    }

    private boolean trusted(String address) {
        if (!literal(address)) return false;
        try {
            return trustedProxies.stream().anyMatch(proxy -> proxy.matches(address));
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }

    private static boolean literal(String address) {
        return address != null && (address.contains(".") || address.contains(":")) && address.matches("[0-9a-fA-F:.]+");
    }
}
