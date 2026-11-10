"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEventStream = startEventStream;
exports.event = event;
function startEventStream(res) {
    res.status(200).set({
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
    });
    res.flushHeaders();
}
function event(res, name, data) {
    if (!res.destroyed && !res.writableEnded)
        res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}
