"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownedNotebook = ownedNotebook;
const common_1 = require("@nestjs/common");
const database_1 = require("../../infrastructure/database/database");
async function ownedNotebook(actor, id) {
    const [notebook] = await (0, database_1.rows)("SELECT * FROM notebook_ai.notebooks WHERE id=$1 AND owner_id=$2", [id, actor.id]);
    if (!notebook)
        throw new common_1.NotFoundException();
    return notebook;
}
