"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const work_assistant_module_1 = require("./modules/work-assistant/work-assistant.module");
const conversation_module_1 = require("./modules/conversation-ai/conversation.module");
const meeting_summary_module_1 = require("./modules/meeting-summary/meeting-summary.module");
const common_1 = require("@nestjs/common");
const health_controller_1 = require("./common/health/health.controller");
const notebooks_module_1 = require("./modules/notebooks/notebooks.module");
const sources_module_1 = require("./modules/sources/sources.module");
const chat_module_1 = require("./modules/chat/chat.module");
const studio_module_1 = require("./modules/studio/studio.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            work_assistant_module_1.WorkAssistantModule,
            conversation_module_1.ConversationModule,
            meeting_summary_module_1.MeetingSummaryModule,
            notebooks_module_1.NotebooksModule,
            sources_module_1.SourcesModule,
            chat_module_1.ChatModule,
            studio_module_1.StudioModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
