"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMeetingSummary = processMeetingSummary;
const env_config_1 = require("../config/env.config");
const database_1 = require("../infrastructure/database/database");
const source_1 = require("../modules/meeting-summary/source");
const speech_client_1 = require("../modules/meeting-summary/speech.client");
const pipeline_1 = require("../modules/meeting-summary/pipeline");
const limits_1 = require("../modules/meeting-summary/limits");
const abort_polling_1 = require("../common/abort-polling");
async function processMeetingSummary(recordingId, runId) {
    const [state] = await (0, database_1.rows)(`UPDATE notebook_ai.meeting_summaries SET status='RUNNING',
    stage='EXTRACTING',updated_at=now() WHERE recording_id=$1 AND run_id=$2 AND status='QUEUED' RETURNING *`, [recordingId, runId]);
    if (!state) {
        // A stalled worker may have sent a paid request before dying. Require explicit retry.
        await (0, database_1.rows)(`UPDATE notebook_ai.meeting_summaries SET status='FAILED',error='Xử lý bị gián đoạn. Bạn có thể bấm thử lại.',updated_at=now()
      WHERE recording_id=$1 AND run_id=$2 AND status='RUNNING'`, [recordingId, runId]);
        return;
    }
    const controller = new AbortController();
    const signal = AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(limits_1.MEETING_LIMITS.requestTimeoutMs),
    ]);
    const started = performance.now();
    let currentStage = "EXTRACTING";
    const timings = {};
    const measure = async (stage, run) => {
        const start = performance.now();
        try {
            return await run();
        }
        finally {
            timings[stage] =
                (timings[stage] || 0) + Math.round(performance.now() - start);
        }
    };
    const authorize = async () => {
        signal.throwIfAborted();
        const current = await (0, source_1.meetingSource)(recordingId, state.actor_id, signal);
        if (current.revision !== state.revision)
            throw new Error("Recording revision changed");
        return current;
    };
    const stopPolling = (0, abort_polling_1.pollUntilAborted)(controller, limits_1.MEETING_LIMITS.accessCheckIntervalMs, authorize);
    const checkpoint = async (stage) => {
        currentStage = stage;
        signal.throwIfAborted();
        const result = await (0, database_1.rows)(`UPDATE notebook_ai.meeting_summaries SET stage=$3,transcript=$4::jsonb,
      partials=$5::jsonb,transcript_complete=$6,updated_at=now() WHERE recording_id=$1 AND run_id=$2 AND status='RUNNING' RETURNING recording_id`, [
            recordingId,
            runId,
            stage,
            JSON.stringify(state.transcript),
            JSON.stringify(state.partials),
            state.transcript_complete,
        ]);
        if (!result.length)
            throw new Error("Meeting summary run superseded");
    };
    try {
        const source = await authorize();
        const context = {
            state,
            signal,
            authorize,
            checkpoint,
            measure,
        };
        await (0, pipeline_1.transcribeMeeting)(source, context);
        const content = await (0, pipeline_1.summarizeMeeting)(context);
        await (0, database_1.rows)(`UPDATE notebook_ai.meeting_summaries SET status='COMPLETED',stage='COMPLETED',content=$3,
      error=NULL,updated_at=now() WHERE recording_id=$1 AND run_id=$2 AND status='RUNNING'`, [recordingId, runId, content]);
        console.info(JSON.stringify({
            event: "meeting_summary",
            status: "ok",
            recording_id: recordingId,
            chunks: state.transcript.length,
            duration_ms: Math.round(performance.now() - started),
            timings,
            stt_concurrency: env_config_1.config.MEETING_STT_CONCURRENCY,
        }));
    }
    catch (error) {
        console.error(JSON.stringify({
            event: "meeting_summary",
            status: "failed",
            recording_id: recordingId,
            error_type: error instanceof Error ? error.constructor.name : "UnknownError",
            aborted: signal.aborted,
            stage: currentStage,
            provider_status: error instanceof speech_client_1.SpeechRecognitionError ? error.status : undefined,
            timings,
        }));
        await (0, database_1.rows)(`UPDATE notebook_ai.meeting_summaries SET status='FAILED',stage='FAILED',
      error='Chưa thể tóm tắt bản ghi. Vui lòng kiểm tra cấu hình hoặc thử lại. Các phần đã xong được giữ lại.',updated_at=now()
      WHERE recording_id=$1 AND run_id=$2 AND status='RUNNING'`, [recordingId, runId]);
    }
    finally {
        stopPolling();
        controller.abort();
    }
}
