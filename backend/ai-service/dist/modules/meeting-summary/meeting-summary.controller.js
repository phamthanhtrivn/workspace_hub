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
exports.MeetingSummaryController = void 0;
const common_1 = require("@nestjs/common");
const meeting_summary_service_1 = require("./meeting-summary.service");
let MeetingSummaryController = class MeetingSummaryController {
    service;
    constructor(service) {
        this.service = service;
    }
    async status(id, key) {
        this.service.authorize(key);
        return this.service.status(id);
    }
    async start(id, key, actorId) {
        this.service.authorize(key);
        return this.service.start(id, actorId);
    }
};
exports.MeetingSummaryController = MeetingSummaryController;
__decorate([
    (0, common_1.Post)(":id/status"),
    __param(0, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Headers)("x-internal-service-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MeetingSummaryController.prototype, "status", null);
__decorate([
    (0, common_1.Post)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Headers)("x-internal-service-key")),
    __param(2, (0, common_1.Body)("actorId", common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MeetingSummaryController.prototype, "start", null);
exports.MeetingSummaryController = MeetingSummaryController = __decorate([
    (0, common_1.Controller)("internal/meeting-summaries"),
    __metadata("design:paramtypes", [meeting_summary_service_1.MeetingSummaryService])
], MeetingSummaryController);
