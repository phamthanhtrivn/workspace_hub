"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollUntilAborted = pollUntilAborted;
function pollUntilAborted(controller, intervalMs, check) {
    let checking = false;
    const timer = setInterval(async () => {
        if (checking || controller.signal.aborted)
            return;
        checking = true;
        try {
            await check();
        }
        catch {
            controller.abort();
        }
        finally {
            checking = false;
        }
    }, intervalMs);
    return () => clearInterval(timer);
}
