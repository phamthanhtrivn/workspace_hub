package vn.workspacehub.user.service;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import vn.workspacehub.user.exception.BusinessException;

public final class AvatarPolicy {
    public static final int MAX_BYTES = 2 * 1024 * 1024;
    public static final int MAX_DIMENSION = 4096;
    public static final int INTENT_TTL_SECONDS = 600;
    private AvatarPolicy() {}

    public static String extension(String mime) {
        return switch (mime) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new BusinessException("Use a JPEG, PNG or WebP avatar.");
        };
    }

    public static void validate(byte[] bytes, String mime) {
        if (bytes.length == 0 || bytes.length > MAX_BYTES) throw new BusinessException("Avatar must be at most 2 MiB.");
        try {
            if (mime.equals("image/webp") && bytes.length > 20 && text(bytes, 12, 4).equals("VP8X") && (bytes[20] & 2) != 0)
                throw new BusinessException("Animated avatars are not supported.");
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new IllegalArgumentException();
                var reader = readers.next();
                try {
                    reader.setInput(input, true, true);
                    String format = reader.getFormatName().toLowerCase();
                    if (!(mime.equals("image/png") && format.equals("png"))
                            && !(mime.equals("image/jpeg") && (format.equals("jpeg") || format.equals("jpg")))
                            && !(mime.equals("image/webp") && format.equals("webp"))) throw new IllegalArgumentException();
                    dimensions(reader.getWidth(0), reader.getHeight(0));
                    if (reader.read(0) == null) throw new IllegalArgumentException();
                } finally { reader.dispose(); }
            }
        } catch (BusinessException failure) { throw failure; }
        catch (Exception failure) { throw new BusinessException("Avatar content does not match its image type."); }
    }

    private static void dimensions(int width, int height) {
        if (width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION) throw new BusinessException("Avatar dimensions must be at most 4096 x 4096.");
    }
    private static String text(byte[] bytes, int start, int count) { return new String(bytes, start, count, StandardCharsets.US_ASCII); }
}
