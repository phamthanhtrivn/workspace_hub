package vn.workspacehub.user.util;

import jakarta.servlet.http.HttpServletRequest;

public class DeviceUtils {

    public static String extractBrowser(String userAgent) {
        if (userAgent == null) return "Unknown";
        String ua = userAgent.toLowerCase();
        if (ua.contains("edg")) return "Edge";
        if (ua.contains("chrome")) return "Chrome";
        if (ua.contains("firefox")) return "Firefox";
        if (ua.contains("safari") && !ua.contains("chrome")) return "Safari";
        if (ua.contains("opera") || ua.contains("opr")) return "Opera";
        return "Unknown";
    }

    public static String extractOperatingSystem(String userAgent) {
        if (userAgent == null) return "Unknown";
        String ua = userAgent.toLowerCase();
        if (ua.contains("win")) return "Windows";
        if (ua.contains("mac")) return "MacOS";
        if (ua.contains("x11") || ua.contains("linux")) return "Linux";
        if (ua.contains("android")) return "Android";
        if (ua.contains("iphone") || ua.contains("ipad")) return "iOS";
        return "Unknown";
    }

    public static String extractPlatform(String userAgent) {
        if (userAgent == null) return "Unknown";
        String ua = userAgent.toLowerCase();
        if (ua.contains("mobi") || ua.contains("android") || ua.contains("iphone")) {
            return "Mobile";
        } else if (ua.contains("ipad") || ua.contains("tablet")) {
            return "Tablet";
        }
        return "Desktop";
    }

    public static String extractDeviceId(HttpServletRequest request) {
        String deviceId = request.getHeader("X-Device-Id");
        if (deviceId != null && !deviceId.isBlank()) {
            return deviceId;
        }
        // Fallback: create a pseudo device ID based on User-Agent to group sessions from same browser
        String ua = request.getHeader("User-Agent");
        if (ua != null) {
            return HashUtils.sha256(ua).substring(0, 16); // Short hash
        }
        return "Unknown";
    }

    public static String extractDeviceName(HttpServletRequest request) {
        String deviceName = request.getHeader("X-Device-Name");
        if (deviceName != null && !deviceName.isBlank()) {
            return deviceName;
        }
        
        String ua = request.getHeader("User-Agent");
        String browser = extractBrowser(ua);
        String os = extractOperatingSystem(ua);
        
        if (!"Unknown".equals(browser) && !"Unknown".equals(os)) {
            return browser + " on " + os;
        } else if (!"Unknown".equals(browser)) {
            return browser;
        } else if (!"Unknown".equals(os)) {
            return os + " Device";
        }
        
        return "Unknown Device";
    }
}
