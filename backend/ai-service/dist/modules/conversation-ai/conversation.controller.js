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
exports.ConversationController = void 0;
const common_1 = require("@nestjs/common");
const service_key_1 = require("../../common/auth/service-key");
const env_config_1 = require("../../config/env.config");
const notebook_queue_1 = require("../../infrastructure/queue/notebook.queue");
let ConversationController = class ConversationController {
    async enqueue(id, key) {
        const expected = env_config_1.config.AI_COMMUNICATION_SERVICE_KEY;
        if (env_config_1.config.AI_ENABLED !== "true" ||
            env_config_1.config.CONVERSATION_AI_ENABLED !== "true" ||
            expected.length < 32)
            throw new common_1.ServiceUnavailableException();
        if (!(0, service_key_1.matchesServiceKey)(key, expected))
            throw new common_1.UnauthorizedException();
        await (0, notebook_queue_1.enqueue)("conversation", id, { requestId: id });
        return { queued: true };
    }
};
exports.ConversationController = ConversationController;
__decorate([
    (0, common_1.Post)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Headers)("x-internal-service-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ConversationController.prototype, "enqueue", null);
exports.ConversationController = ConversationController = __decorate([
    (0, common_1.Controller)("internal/conversation-ai")
], ConversationController);
