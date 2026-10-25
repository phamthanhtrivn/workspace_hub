"use client";

import { useMeetingSummary } from "../../hooks/use-meeting-summary";
import { MeetingButton } from "../ui/meeting-form-controls";

export function MeetingRecordingSummary({
  recordingId,
}: {
  recordingId: string;
}) {
  const state = useMeetingSummary(recordingId);
  const summary = state.summary;
  const running = summary?.status === "QUEUED" || summary?.status === "RUNNING";
  const labels = {
    QUEUED: "Đang chờ xử lý…",
    EXTRACTING: "Đang chuẩn bị âm thanh…",
    TRANSCRIBING: "Đang chuyển lời nói thành văn bản…",
    SUMMARIZING: "Đang tổng hợp nội dung cuộc họp…",
    COMPLETED: "Đã hoàn thành",
    FAILED: "Xử lý chưa hoàn thành",
  };
  if (state.loading)
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Đang tải bản tóm tắt…
      </p>
    );
  if (state.unavailable)
    return (
      <div className="mt-4 text-sm" role="alert">
        <p>Không thể tải bản tóm tắt hoặc bạn không còn quyền truy cập.</p>
        <MeetingButton
          tone="secondary"
          className="mt-2"
          onClick={() => void state.refresh()}
        >
          Tải lại
        </MeetingButton>
      </div>
    );
  if (!summary?.enabled) return null;
  return (
    <section
      className="mt-4 border-t border-border pt-4"
      aria-labelledby="meeting-summary-title"
    >
      <h3 id="meeting-summary-title" className="text-base font-semibold">
        Tóm tắt cuộc họp
      </h3>
      {running && (
        <p
          className="mt-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {labels[summary.stage ?? "QUEUED"]}
          {summary.stage === "TRANSCRIBING" &&
            !!summary.transcribedChunks &&
            ` Đã xử lý ${summary.transcribedChunks} đoạn.`}
        </p>
      )}
      {summary.status === "COMPLETED" && (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            Nội dung do AI tổng hợp. Hãy đối chiếu bản ghi trước khi sử dụng
            quyết định hoặc đầu việc. Mốc thời gian chỉ gần đúng; bản ghi trộn
            không xác định tên từng người nói.
          </p>
          <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {summary.content}
          </div>
        </>
      )}
      {summary.status === "FAILED" && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {summary.error || "Chưa thể tạo tóm tắt. Vui lòng thử lại."}
        </p>
      )}
      {summary.canCreate && !running && summary.status !== "COMPLETED" && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Tạo tóm tắt từ lời nói trong bản ghi. Âm thanh được gửi tới Google
            để nhận dạng, văn bản được gửi tới dịch vụ AI để tổng hợp; có thể
            phát sinh phí.
          </p>
          <MeetingButton
            className="mt-3"
            disabled={state.creating}
            onClick={state.create}
          >
            {state.creating
              ? "Đang gửi yêu cầu…"
              : summary.status === "FAILED"
                ? "Thử lại tóm tắt"
                : "Tóm tắt bằng AI"}
          </MeetingButton>
        </>
      )}
      {!summary.canCreate && summary.status === "NOT_CREATED" && (
        <p className="mt-2 text-sm text-muted-foreground">
          Chủ bản ghi có thể tạo bản tóm tắt cho cuộc họp này.
        </p>
      )}
      {state.createError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          Chưa thể bắt đầu. Vui lòng kiểm tra dịch vụ hoặc thử lại sau.
        </p>
      )}
    </section>
  );
}
