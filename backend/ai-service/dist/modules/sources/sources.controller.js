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
exports.SourcesController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth/auth.guard");
const zod_1 = require("zod");
const sources_service_1 = require("./sources.service");
const notebook_access_1 = require("../../common/auth/notebook-access");
const validation_1 = require("../../common/validation");
const upload_validation_1 = require("./upload-validation");
let SourcesController = class SourcesController {
    sources;
    constructor(sources) {
        this.sources = sources;
    }
    async visual(req, id, sourceId, imageId, res) {
        res.set("Cache-Control", "no-store");
        return {
            data: await this.sources.visual(req.actor, id, sourceId, imageId),
        };
    }
    async checkUpload(req, id, name) {
        return (0, upload_validation_1.withUploadCheck)(async () => {
            await (0, notebook_access_1.ownedNotebook)(req.actor, id);
            if (req.headers["content-type"] !== "application/octet-stream")
                throw new common_1.BadRequestException("Gửi file dưới dạng application/octet-stream.");
            const size = (0, validation_1.parse)(zod_1.z.coerce.number().int().positive(), req.headers["x-file-size"]);
            name = (0, validation_1.parse)(zod_1.z.string().min(1).max(300), name);
            (0, upload_validation_1.checkFile)(name, size);
            const count = (0, validation_1.parse)(zod_1.z.coerce.number().int().min(1).max(5), req.headers["x-upload-count"]);
            const bytes = (0, validation_1.parse)(zod_1.z.coerce.number().int().min(size), req.headers["x-upload-bytes"]);
            (0, upload_validation_1.checkCapacity)(await this.sources.sources(id), count, bytes);
            const content = await (0, upload_validation_1.readUpload)(req, size);
            return { data: await (0, upload_validation_1.validateContent)(name, content, id) };
        });
    }
    async add(req, id, body) {
        const { refs } = (0, validation_1.parse)(zod_1.z.object({
            refs: zod_1.z
                .array(zod_1.z.object({
                documentId: zod_1.z.string().uuid(),
                versionId: zod_1.z.string().uuid().optional(),
            }))
                .min(1)
                .max(5),
        }), body);
        return { data: await this.sources.add(req.actor, id, refs) };
    }
    async source(req, id, sourceId, action) {
        return {
            data: await this.sources.sourceAction(req.actor, id, sourceId, (0, validation_1.parse)(zod_1.z.enum(["retry", "remove", "preview"]), action)),
        };
    }
};
exports.SourcesController = SourcesController;
__decorate([
    (0, common_1.Post)("notebooks/:id/sources/:sourceId/images/:imageId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)("sourceId", common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Param)("imageId")),
    __param(4, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SourcesController.prototype, "visual", null);
__decorate([
    (0, common_1.Post)("notebooks/:id/upload-checks"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)("name")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SourcesController.prototype, "checkUpload", null);
__decorate([
    (0, common_1.Post)("notebooks/:id/sources"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SourcesController.prototype, "add", null);
__decorate([
    (0, common_1.Post)("notebooks/:id/sources/:sourceId/:action"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)("sourceId", common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Param)("action")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], SourcesController.prototype, "source", null);
exports.SourcesController = SourcesController = __decorate([
    (0, common_1.Controller)("api/ai"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [sources_service_1.SourcesService])
], SourcesController);
