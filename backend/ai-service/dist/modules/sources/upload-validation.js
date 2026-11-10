"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFile = checkFile;
exports.checkCapacity = checkCapacity;
exports.checkManifests = checkManifests;
exports.withUploadCheck = withUploadCheck;
exports.readUpload = readUpload;
exports.validateContent = validateContent;
exports.downloadSource = downloadSource;
const common_1 = require("@nestjs/common");
const rag_client_1 = require("../../infrastructure/integrations/rag.client");
const pipeline_profiler_1 = require("../../common/profiling/pipeline-profiler");
const env_config_1 = require("../../config/env.config");
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_NOTEBOOK_BYTES = 50 * 1024 * 1024;
function checkFile(name, size) {
    const supported = env_config_1.config.VISUAL_ENABLED === "true"
        ? /\.(pdf|docx|txt|md|png|jpe?g|webp)$/i
        : /\.(pdf|docx|txt|md)$/i;
    if (!name || name.length > 300 || !supported.test(name))
        throw new common_1.BadRequestException("Chỉ nhận PDF, DOCX, TXT, MD hoặc ảnh PNG/JPEG/WebP khi bật đọc ảnh (tên tối đa 300 ký tự).");
    if (!Number.isSafeInteger(size) || size <= 0)
        throw new common_1.BadRequestException("File rỗng hoặc kích thước không hợp lệ.");
    if (size > MAX_FILE_BYTES)
        throw new common_1.PayloadTooLargeException("File vượt 20 MiB. Hãy tách thành file nhỏ hơn.");
}
function checkCapacity(existing, count, bytes) {
    if (!Number.isSafeInteger(count) || count < 1 || existing.length + count > 5)
        throw new common_1.BadRequestException("Notebook tối đa 5 file. Hãy bỏ bớt nguồn trước khi tải lên.");
    if (!Number.isSafeInteger(bytes) ||
        bytes < 1 ||
        existing.reduce((sum, s) => sum + Number(s.size_bytes), 0) + bytes >
            MAX_NOTEBOOK_BYTES)
        throw new common_1.PayloadTooLargeException("Tổng dung lượng notebook vượt 50 MiB. Hãy giảm số lượng hoặc dung lượng file.");
}
function checkManifests(existing, manifests) {
    for (const m of manifests) {
        checkFile(m.name, m.sizeBytes);
        if (!m.current)
            throw new common_1.BadRequestException("Chỉ nhận phiên bản tài liệu hiện tại.");
    }
    const unique = [
        ...new Map(manifests.map((m) => [`${m.documentId}:${m.versionId}`, m])).values(),
    ];
    const fresh = unique.filter((m) => !existing.some((s) => s.document_id === m.documentId && s.version_id === m.versionId));
    if (fresh.length)
        checkCapacity(existing, fresh.length, fresh.reduce((sum, m) => sum + m.sizeBytes, 0));
    return fresh;
}
// Do not buffer concurrent 20 MiB uploads or let validation build an unbounded backlog.
let checking = false;
async function withUploadCheck(run) {
    if (checking)
        throw new common_1.HttpException("Đang kiểm tra file khác. Vui lòng thử lại sau ít giây.", 429);
    checking = true;
    try {
        return await run();
    }
    finally {
        checking = false;
    }
}
function readUpload(stream, expectedSize, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const parts = [];
        let size = 0;
        const finish = (error) => {
            clearTimeout(timer);
            stream.pause();
            stream.off("data", onData);
            stream.off("end", onEnd);
            stream.off("error", onError);
            stream.off("aborted", onAbort);
            if (error)
                reject(error);
            else
                resolve(Buffer.concat(parts, size));
        };
        const onData = (chunk) => {
            size += chunk.length;
            if (size > MAX_FILE_BYTES || size > expectedSize)
                finish(new common_1.PayloadTooLargeException("File vượt kích thước khai báo hoặc 20 MiB."));
            else
                parts.push(chunk);
        };
        const onEnd = () => finish(size === expectedSize
            ? undefined
            : new common_1.BadRequestException("Kích thước file không khớp."));
        const onError = () => finish(new common_1.BadRequestException("Không đọc được file tải lên."));
        const onAbort = () => finish(new common_1.BadRequestException("Đã ngắt tải file."));
        const timer = setTimeout(() => finish(new common_1.RequestTimeoutException("Tải file quá thời gian cho phép.")), timeoutMs);
        stream.on("data", onData);
        stream.once("end", onEnd);
        stream.once("error", onError);
        stream.once("aborted", onAbort);
    });
}
async function validateContent(name, data, scopeId) {
    checkFile(name, data.length);
    return (0, pipeline_profiler_1.profiled)("preflight", async (timing) => {
        const content = await timing.measure("encode_ms", () => data.toString("base64"));
        return timing.measure("rag_ms", () => (0, rag_client_1.rag)("/validate", {
            scopeId,
            name,
            content,
        }, AbortSignal.timeout(45000)));
    });
}
async function downloadSource(manifest, signal) {
    checkFile(manifest.name, manifest.sizeBytes);
    if (!manifest.downloadUrl)
        throw new common_1.ServiceUnavailableException("Không lấy được liên kết file gốc.");
    let response;
    try {
        response = await fetch(manifest.downloadUrl, {
            signal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
                : AbortSignal.timeout(30000),
            redirect: "error",
        });
    }
    catch {
        throw new common_1.ServiceUnavailableException("Không tải được file gốc để kiểm tra. Hãy thử lại.");
    }
    if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new common_1.ServiceUnavailableException("Không tải được file gốc để kiểm tra. Hãy thử lại.");
    }
    const reader = response.body.getReader();
    const parts = [];
    let size = 0;
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done)
                break;
            size += value.length;
            if (size > MAX_FILE_BYTES || size > manifest.sizeBytes)
                throw new common_1.PayloadTooLargeException("File vượt 20 MiB hoặc kích thước phiên bản không khớp.");
            parts.push(value);
        }
    }
    finally {
        await reader.cancel().catch(() => { });
    }
    if (size !== manifest.sizeBytes)
        throw new common_1.BadRequestException("Kích thước phiên bản nguồn không khớp.");
    return Buffer.concat(parts, size);
}
