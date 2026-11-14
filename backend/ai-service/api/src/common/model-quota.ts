import { randomUUID } from "node:crypto";
import { config } from "../config/env.config";
import { transaction } from "../infrastructure/database/database";
import {
  ModelDailyQuotaException,
  ModelInputBudgetException,
  ModelMinuteQuotaException,
} from "./errors/model-quota.exception";

export async function admitModel(
  input: number,
  model = config.LLM_MODEL,
  purpose: "interactive" | "vision" = "interactive",
) {
  if (
    !Number.isSafeInteger(input) ||
    input < 1 ||
    input > config.LLM_TOKENS_PER_MINUTE
  )
    throw new ModelInputBudgetException();
  await transaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,8087002))",
      [model],
    );
    const {
      rows: [usage],
    } = await client.query(
      `SELECT
      count(*) FILTER (WHERE created_at > now()-interval '1 minute')::int rpm,
      coalesce(sum(input_tokens) FILTER (WHERE created_at > now()-interval '1 minute'),0)::int tokens,
      count(*) FILTER (WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int daily,
      coalesce(ceil(extract(epoch FROM (min(created_at) FILTER (WHERE created_at > now()-interval '1 minute') + interval '1 minute' - now())) * 1000),2000)::int retry_after_ms
      FROM notebook_ai.model_calls WHERE model=$1 AND created_at >= LEAST(date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',now()-interval '1 minute')`,
      [model],
    );
    const reserve = Math.min(
      config.LLM_INTERACTIVE_RESERVE_PER_DAY ?? 0,
      Math.floor(config.LLM_REQUESTS_PER_DAY / 2),
    );
    const dailyLimit =
      config.LLM_REQUESTS_PER_DAY - (purpose === "vision" ? reserve : 0);
    if (usage.daily >= dailyLimit) {
      const now = new Date();
      const reset = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
      );
      throw new ModelDailyQuotaException(
        reset - now.getTime(),
        purpose === "vision",
      );
    }
    if (
      usage.rpm >= config.LLM_REQUESTS_PER_MINUTE ||
      usage.tokens + input > config.LLM_TOKENS_PER_MINUTE
    )
      throw new ModelMinuteQuotaException(
        Math.max(1, Math.min(60000, usage.retry_after_ms ?? 2000)),
      );
    await client.query(
      "INSERT INTO notebook_ai.model_calls(id,model,input_tokens) VALUES($1,$2,$3)",
      [randomUUID(), model, input],
    );
  });
}
