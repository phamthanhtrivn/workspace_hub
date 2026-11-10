"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingSummaryService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const service_key_1 = require("../../common/auth/service-key");
const env_config_1 = require("../../config/env.config");
const database_1 = require("../../infrastructure/database/database");
const notebook_queue_1 = require("../../infrastructure/queue/notebook.queue");
const source_1 = require("./source");
let MeetingSummaryService = class MeetingSummaryService {
    authorize(key) {
        const expected = env_config_1.config.AI_COMMUNICATION_SERVICE_KEY;
        if (env_config_1.config.AI_ENABLED !== "true" ||
            env_config_1.config.MEETING_SUMMARY_ENABLED !== "true" ||
            expected.length < 32)
            throw new common_1.ServiceUnavailableException("Meeting summaries are not configured");
        if (!(0, service_key_1.matchesServiceKey)(key, expected))
            throw new common_1.UnauthorizedException();
    }
    async status(id) {
        const [summary] = await (0, database_1.rows)(`SELECT status,stage,content,error,updated_at AS "updatedAt",
      jsonb_array_length(transcript) AS "transcribedChunks" FROM notebook_ai.meeting_summaries WHERE recording_id=$1`, [id]);
        return summary ?? { status: "NOT_CREATED" };
    }
    async start(id, actorId) {
        const redis = await notebook_queue_1.meetingSummaryQueue.client;
        if ((await redis.get("wh-notebook:meeting-summary-worker-heartbeat")) !==
            "ready:meeting-v1")
            throw new common_1.ServiceUnavailableException("Meeting summary worker is unavailable");
        const source = await (0, source_1.meetingSource)(id, actorId, AbortSignal.timeout(15000));
        const runId = (0, node_crypto_1.randomUUID)();
        const [created] = await (0, database_1.rows)(`INSERT INTO notebook_ai.meeting_summaries
      (recording_id,run_id,actor_id,revision,status) VALUES($1,$2,$3,$4,'QUEUED')
      ON CONFLICT(recording_id) DO UPDATE SET run_id=$2,actor_id=$3,revision=$4,status='QUEUED',
      stage='QUEUED',content=NULL,error=NULL,updated_at=now(),
      transcript=CASE WHEN meeting_summaries.revision=$4 THEN meeting_summaries.transcript ELSE '[]'::jsonb END,
      partials=CASE WHEN meeting_summaries.revision=$4 THEN meeting_summaries.partials ELSE '[]'::jsonb END
      ,transcript_complete=CASE WHEN meeting_summaries.revision=$4 THEN meeting_summaries.transcript_complete ELSE false END
      WHERE meeting_summaries.status='FAILED' OR
        (meeting_summaries.status='COMPLETED' AND meeting_summaries.revision<>$4)
      RETURNING run_id`, [id, runId, actorId, source.revision]);
        if (created) {
            try {
                await notebook_queue_1.meetingSummaryQueue.add("meeting-summary", { recordingId: id, runId }, {
                    jobId: `meeting-${runId}`,
                    attempts: 1,
                });
            }
            catch {
                await (0, database_1.rows)(`UPDATE notebook_ai.meeting_summaries SET status='FAILED',stage='FAILED',error='Không thể xếp lịch xử lý. Vui lòng thử lại.',updated_at=now()
          WHERE recording_id=$1 AND run_id=$2 AND status='QUEUED'`, [id, runId]);
                throw new common_1.ServiceUnavailableException("Meeting queue unavailable");
            }
        }
        return this.status(id);
    }
};
exports.MeetingSummaryService = MeetingSummaryService;
exports.MeetingSummaryService = MeetingSummaryService = __decorate([
    (0, common_1.Injectable)()
], MeetingSummaryService);
