import { Injectable } from "@nestjs/common";
import { db, rows, transaction } from "./database";

/** Typed access to the existing process pool. Entrypoints retain shutdown ownership. */
@Injectable()
export class AiDatabaseClient {
  readonly pool = db;
  readonly rows = rows;
  readonly transaction = transaction;
}

export const aiDatabase = new AiDatabaseClient();
