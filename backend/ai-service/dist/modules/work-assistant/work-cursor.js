"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationCursor = conversationCursor;
exports.parseConversationCursor = parseConversationCursor;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const cursorSchema = zod_1.z
    .object({
    id: zod_1.z.string().uuid(),
    updatedAt: zod_1.z.string().datetime({ offset: true }),
})
    .strict();
function conversationCursor(id, updatedAt) {
    return Buffer.from(JSON.stringify({
        id,
        updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
    })).toString("base64url");
}
function parseConversationCursor(value) {
    // Accept cursors issued before timestamp boundaries were introduced.
    if (zod_1.z.string().uuid().safeParse(value).success)
        return { id: value };
    try {
        if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value))
            throw new Error();
        return cursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    }
    catch {
        throw new common_1.BadRequestException("Invalid conversation cursor");
    }
}
