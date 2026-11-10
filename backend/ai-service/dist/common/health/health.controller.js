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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const env_config_1 = require("../../config/env.config");
const database_1 = require("../../infrastructure/database/database");
const notebook_queue_1 = require("../../infrastructure/queue/notebook.queue");
const http_dependencies_1 = require("./http-dependencies");
let HealthController = class HealthController {
    health() {
        return {
            status: "ok",
            service: "notebook-ai",
            enabled: env_config_1.config.AI_ENABLED === "true",
        };
    }
    async ready() {
        try {
            await database_1.db.query("SELECT id FROM notebook_ai.notebooks LIMIT 0");
            await Promise.all([
                notebook_queue_1.queue.getJobCounts("waiting"),
                notebook_queue_1.summaryQueue.getJobCounts("waiting"),
            ]);
            const redis = await notebook_queue_1.queue.client;
            if (env_config_1.config.MEETING_SUMMARY_ENABLED === "true") {
                await notebook_queue_1.meetingSummaryQueue.getJobCounts("waiting");
                if ((await redis.get("wh-notebook:meeting-summary-worker-heartbeat")) !==
                    "ready:meeting-v1")
                    throw new Error("Meeting summary worker unavailable");
            }
            if ((await redis.get("wh-notebook:worker-heartbeat")) !==
                notebook_queue_1.WORKER_HEARTBEAT_VALUE)
                throw new Error("Notebook job worker unavailable");
            if (env_config_1.config.CONVERSATION_AI_ENABLED === "true") {
                await notebook_queue_1.conversationQueue.getJobCounts("waiting");
                if ((await redis.get("wh-notebook:conversation-worker-heartbeat")) !==
                    "ready:conversation-v1")
                    throw new Error("Conversation worker unavailable");
            }
            await (0, http_dependencies_1.checkHttpDependencies)();
            return this.health();
        }
        catch {
            throw new common_1.ServiceUnavailableException();
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)("health"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "health", null);
__decorate([
    (0, common_1.Get)("ready"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)()
], HealthController);
