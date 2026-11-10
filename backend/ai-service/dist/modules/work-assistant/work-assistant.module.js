"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkAssistantModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../../common/auth/auth.module");
const work_assistant_controller_1 = require("./work-assistant.controller");
const work_assistant_service_1 = require("./work-assistant.service");
const work_context_1 = require("./work-context");
const work_store_1 = require("./work-store");
let WorkAssistantModule = class WorkAssistantModule {
};
exports.WorkAssistantModule = WorkAssistantModule;
exports.WorkAssistantModule = WorkAssistantModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [work_assistant_controller_1.WorkAssistantController],
        providers: [work_assistant_service_1.WorkAssistantService, work_store_1.WorkStore, work_context_1.WorkContextService],
    })
], WorkAssistantModule);
