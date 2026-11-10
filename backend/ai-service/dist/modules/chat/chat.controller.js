"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth/auth.guard");
const zod_1 = require("zod");
const chat_service_1 = require("./chat.service");
const validation_1 = require("../../common/validation");
let ChatController = class ChatController {
    chat;
    constructor(chat) {
        this.chat = chat;
    }
    async message(req, id, body, res) {
        const data = (0, validation_1.parse)(zod_1.z.object({
            question: zod_1.z.string().trim().min(1).max(4000),
            sourceIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(5),
            requestId: zod_1.z.string().uuid(),
        }), body);
        await this.chat.answer(req.actor, id, data.question, data.sourceIds, data.requestId, res);
    }
    async cancel(req, id) {
        return { data: await this.chat.cancel(req.actor, id) };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)("notebooks/:id/messages"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "message", null);
__decorate([
    (0, common_1.Post)("requests/:id/cancel"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "cancel", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)("api/ai"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
