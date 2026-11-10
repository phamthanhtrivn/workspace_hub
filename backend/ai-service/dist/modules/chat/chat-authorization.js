"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatAuthorization = createChatAuthorization;
const evidence_policy_1 = require("../../common/evidence-policy");
const document_client_1 = require("../../infrastructure/integrations/document.client");
function createChatAuthorization(options) {
    let pending;
    async function check() {
        options.signal.throwIfAborted();
        const current = await options.loadSources();
        options.signal.throwIfAborted();
        if (!(0, evidence_policy_1.visibleSnapshot)(options.snapshot, current))
            throw new Error("Nguồn đã thay đổi");
        await (0, document_client_1.authorizeSources)(options.actor, options.sources, false, options.signal);
        options.signal.throwIfAborted();
    }
    return () => {
        pending ??= check().finally(() => {
            pending = undefined;
        });
        return pending;
    };
}
