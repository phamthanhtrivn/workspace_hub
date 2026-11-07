import { NotFoundException } from "@nestjs/common";
import { rows } from "../../infrastructure/database/database";
import type { Actor } from "../types";
export async function ownedNotebook(actor: Actor, id: string) {
  const [notebook] = await rows(
    "SELECT * FROM notebook_ai.notebooks WHERE id=$1 AND owner_id=$2",
    [id, actor.id],
  );
  if (!notebook) throw new NotFoundException();
  return notebook;
}
