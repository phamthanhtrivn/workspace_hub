"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDocuments = resolveDocuments;
exports.authorizeSources = authorizeSources;
exports.resolveChatAttachment = resolveChatAttachment;
const common_1 = require("@nestjs/common");
const env_config_1 = require("../../config/env.config");
async function resolveDocuments(actor, refs, download = false, signal) {
    signal?.throwIfAborted();
    let response;
    try {
        response = await fetch(`${env_config_1.config.DOCUMENT_SERVICE_URL}/internal/notebook-documents/resolve`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-internal-service-key": env_config_1.config.AI_DOCUMENT_SERVICE_KEY,
            },
            body: JSON.stringify({
                userId: actor.id,
                userEmail: actor.email,
                refs,
                download,
            }),
            signal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
                : AbortSignal.timeout(10000),
            redirect: "error",
        });
    }
    catch {
        signal?.throwIfAborted();
        throw new common_1.ServiceUnavailableException("Không xác minh được quyền tài liệu");
    }
    if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 403 || response.status === 404)
            throw new common_1.ForbiddenException("Nguồn đã bị xóa hoặc mất quyền truy cập");
        if (response.status === 401)
            throw new common_1.ServiceUnavailableException("Khóa nội bộ giữa AI và Document Service chưa khớp cấu hình");
        throw new common_1.ServiceUnavailableException("Document Service chưa sẵn sàng");
    }
    const result = (await response.json());
    signal?.throwIfAborted();
    return result.data;
}
async function authorizeSources(actor, sources, download = false, signal) {
    signal?.throwIfAborted();
    if (!sources.length)
        return [];
    const manifests = await resolveDocuments(actor, sources.map((s) => ({
        documentId: s.document_id,
        versionId: s.version_id,
    })), download, signal);
    for (let i = 0; i < sources.length; i++) {
        const manifest = manifests[i];
        const source = sources[i];
        if (!manifest ||
            manifest.documentId !== source.document_id ||
            manifest.versionId !== source.version_id ||
            manifest.revision !== source.revision ||
            !manifest.current)
            throw new common_1.ForbiddenException("Nguồn đã thay đổi. Hãy thêm phiên bản mới.");
    }
    return manifests;
}
async function resolveChatAttachment(ref, download, signal) {
    let response;
    try {
        response = await fetch(`${env_config_1.config.DOCUMENT_SERVICE_URL}/internal/notebook-documents/resolve-chat-attachment`, {
            method: "POST",
            redirect: "error",
            headers: {
                "content-type": "application/json",
                "x-internal-service-key": env_config_1.config.AI_DOCUMENT_SERVICE_KEY,
            },
            body: JSON.stringify({ ...ref, download }),
            signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
        });
    }
    catch {
        throw new common_1.ServiceUnavailableException("Không xác minh được quyền tài liệu gốc.");
    }
    if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 403 || response.status === 404)
            throw new common_1.ForbiddenException("Tài liệu gốc đã bị xóa hoặc bạn chưa có quyền đọc.");
        throw new common_1.ServiceUnavailableException("Document Service chưa sẵn sàng xác minh file.");
    }
    return (await response.json()).data;
}
