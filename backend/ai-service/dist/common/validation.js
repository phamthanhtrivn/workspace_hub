"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.title = void 0;
exports.parse = parse;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
exports.title = zod_1.z.string().trim().min(1).max(200);
function parse(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success)
        throw new common_1.BadRequestException("Dữ liệu không hợp lệ");
    return result.data;
}
