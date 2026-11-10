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
exports.StudioController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth/auth.guard");
const zod_1 = require("zod");
const studio_service_1 = require("./studio.service");
const validation_1 = require("../../common/validation");
let StudioController = class StudioController {
    studio;
    constructor(studio) {
        this.studio = studio;
    }
    async note(req, id, body) {
        const data = (0, validation_1.parse)(zod_1.z
            .object({
            title: validation_1.title,
            content: zod_1.z.string().max(20000).optional(),
            messageId: zod_1.z.string().uuid().optional(),
            noteId: zod_1.z.string().uuid().optional(),
        })
            .refine((v) => Boolean(v.content?.trim() || v.messageId)), body);
        return { data: await this.studio.note(req.actor, id, data) };
    }
    async deleteNote(req, id, noteId) {
        await this.studio.deleteNote(req.actor, id, noteId);
        return { data: {} };
    }
    async artifact(req, id, body) {
        const { kind, sourceIds } = (0, validation_1.parse)(zod_1.z.object({
            kind: zod_1.z.enum(["OVERVIEW", "SUMMARY"]),
            sourceIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(5).optional(),
        }), body);
        return { data: await this.studio.artifact(req.actor, id, kind, sourceIds) };
    }
};
exports.StudioController = StudioController;
__decorate([
    (0, common_1.Post)("notebooks/:id/notes"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], StudioController.prototype, "note", null);
__decorate([
    (0, common_1.Delete)("notebooks/:id/notes/:noteId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)("noteId", common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], StudioController.prototype, "deleteNote", null);
__decorate([
    (0, common_1.Post)("notebooks/:id/artifacts"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], StudioController.prototype, "artifact", null);
exports.StudioController = StudioController = __decorate([
    (0, common_1.Controller)("api/ai"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [studio_service_1.StudioService])
], StudioController);
