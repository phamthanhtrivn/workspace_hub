"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readResponseText = readResponseText;
const common_1 = require("@nestjs/common");
async function readResponseText(response, maxBytes) {
    const tooLarge = () => new common_1.ServiceUnavailableException("Nguồn dữ liệu vượt giới hạn.");
    if (Number(response.headers.get("content-length")) > maxBytes) {
        await response.body?.cancel();
        throw tooLarge();
    }
    if (!response.body)
        return "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parts = [];
    let bytes = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            bytes += value.byteLength;
            if (bytes > maxBytes) {
                await reader.cancel();
                throw tooLarge();
            }
            parts.push(decoder.decode(value, { stream: true }));
        }
        parts.push(decoder.decode());
        return parts.join("");
    }
    finally {
        reader.releaseLock();
    }
}
