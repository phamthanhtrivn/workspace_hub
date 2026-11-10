"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const service_key_1 = require("./service-key");
const env_config_1 = require("../../config/env.config");
const gatewayIdentity = zod_1.z
    .object({
    "x-user-id": zod_1.z.string().uuid(),
    "x-user-email": zod_1.z.string().email(),
    "x-user-role": zod_1.z.string().optional(),
})
    .refine((headers) => headers["x-user-role"] !== "RESET_PASSWORD_ROLE");
let AuthGuard = class AuthGuard {
    canActivate(context) {
        if (env_config_1.config.AI_ENABLED !== "true")
            throw new common_1.ServiceUnavailableException("Notebook AI chưa được bật");
        const req = context.switchToHttp().getRequest();
        const proof = req.headers["x-workspace-gateway-key"];
        const keys = [env_config_1.config.AI_GATEWAY_KEY, env_config_1.config.AI_GATEWAY_KEY_PREVIOUS].filter((key) => key.length >= 32);
        if (!keys.length)
            throw new common_1.ServiceUnavailableException("Gateway authentication is not configured");
        if (!keys.some((key) => (0, service_key_1.matchesServiceKey)(proof, key)))
            throw new common_1.UnauthorizedException("Trusted gateway required");
        // Kong verifies the JWT and replaces client-supplied identity headers.
        // The dedicated proof also rejects forged user headers sent directly to this service.
        const result = gatewayIdentity.safeParse(req.headers);
        if (!result.success)
            throw new common_1.UnauthorizedException("Missing or invalid gateway identity");
        req.actor = {
            id: result.data["x-user-id"],
            email: result.data["x-user-email"],
        };
        return true;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)()
], AuthGuard);
