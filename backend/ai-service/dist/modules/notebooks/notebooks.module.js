"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebooksModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../../common/auth/auth.module");
const sources_module_1 = require("../sources/sources.module");
const notebooks_controller_1 = require("./notebooks.controller");
const notebooks_service_1 = require("./notebooks.service");
let NotebooksModule = class NotebooksModule {
};
exports.NotebooksModule = NotebooksModule;
exports.NotebooksModule = NotebooksModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, sources_module_1.SourcesModule],
        controllers: [notebooks_controller_1.NotebooksController],
        providers: [notebooks_service_1.NotebooksService],
        exports: [notebooks_service_1.NotebooksService],
    })
], NotebooksModule);
