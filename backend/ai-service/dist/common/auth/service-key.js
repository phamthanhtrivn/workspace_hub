"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchesServiceKey = matchesServiceKey;
const node_crypto_1 = require("node:crypto");
function matchesServiceKey(supplied, expected) {
    if (typeof supplied !== "string")
        return false;
    const suppliedBytes = Buffer.from(supplied);
    const expectedBytes = Buffer.from(expected);
    return (suppliedBytes.length === expectedBytes.length &&
        (0, node_crypto_1.timingSafeEqual)(suppliedBytes, expectedBytes));
}
