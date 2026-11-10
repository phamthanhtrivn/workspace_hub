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
exports.NotebooksController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth/auth.guard");
const zod_1 = require("zod");
const notebooks_service_1 = require("./notebooks.service");
const validation_1 = require("../../common/validation");
let NotebooksController = class NotebooksController {
    notebooks;
    constructor(notebooks) {
        this.notebooks = notebooks;
    }
    async list(req) {
        return { data: await this.notebooks.list(req.actor) };
    }
    async create(req, body) {
        return {
            data: await this.notebooks.create(req.actor, (0, validation_1.parse)(zod_1.z.object({ title: validation_1.title }), body).title),
        };
    }
    async get(req, id) {
        return { data: await this.notebooks.get(req.actor, id) };
    }
    async rename(req, id, body) {
        return {
            data: await this.notebooks.rename(req.actor, id, (0, validation_1.parse)(zod_1.z.object({ title: validation_1.title }), body).title),
        };
    }
    async remove(req, id) {
        await this.notebooks.remove(req.actor, id);
        return { data: {} };
    }
};
exports.NotebooksController = NotebooksController;
__decorate([
    (0, common_1.Get)("notebooks"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotebooksController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("notebooks"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotebooksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("notebooks/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotebooksController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)("notebooks/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], NotebooksController.prototype, "rename", null);
__decorate([
    (0, common_1.Delete)("notebooks/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotebooksController.prototype, "remove", null);
exports.NotebooksController = NotebooksController = __decorate([
    (0, common_1.Controller)("api/ai"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [notebooks_service_1.NotebooksService])
], NotebooksController);
