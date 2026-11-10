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
exports.WorkAssistantController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth/auth.guard");
const validation_1 = require("../../common/validation");
const work_assistant_schemas_1 = require("./work-assistant.schemas");
const work_assistant_service_1 = require("./work-assistant.service");
let WorkAssistantController = class WorkAssistantController {
    service;
    constructor(service) {
        this.service = service;
    }
    async overview(req, query) {
        return this.service.overview(req.actor, (0, validation_1.parse)(work_assistant_schemas_1.overviewSchema, query));
    }
    async session(req, query) {
        return this.service.session(req.actor, (0, validation_1.parse)(work_assistant_schemas_1.sessionSchema, query));
    }
    async sessions(req, query) {
        return this.service.sessions(req.actor, (0, validation_1.parse)(work_assistant_schemas_1.sessionsSchema, query));
    }
    async createSession(req, body) {
        const { projectId } = (0, validation_1.parse)(work_assistant_schemas_1.createSessionSchema, body);
        return this.service.createSession(req.actor, projectId);
    }
    async message(req, res, id, body) {
        await this.service.message(req.actor, id, (0, validation_1.parse)(work_assistant_schemas_1.messageSchema, body), res);
    }
    async cancel(req, id) {
        return this.service.cancel(req.actor, id);
    }
};
exports.WorkAssistantController = WorkAssistantController;
__decorate([
    (0, common_1.Get)("overview"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorkAssistantController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)("session"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorkAssistantController.prototype, "session", null);
__decorate([
    (0, common_1.Get)("sessions"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorkAssistantController.prototype, "sessions", null);
__decorate([
    (0, common_1.Post)("sessions"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorkAssistantController.prototype, "createSession", null);
__decorate([
    (0, common_1.Post)("sessions/:id/messages"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], WorkAssistantController.prototype, "message", null);
__decorate([
    (0, common_1.Post)("requests/:id/cancel"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WorkAssistantController.prototype, "cancel", null);
exports.WorkAssistantController = WorkAssistantController = __decorate([
    (0, common_1.Controller)("api/ai/work-assistant"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [work_assistant_service_1.WorkAssistantService])
], WorkAssistantController);
