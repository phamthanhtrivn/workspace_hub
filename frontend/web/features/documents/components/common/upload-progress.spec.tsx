import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { UPLOAD_SUCCESS_DISMISS_DELAY_MS } from "../../types/documents.constants";
import { UploadState } from "../../types/documents.enums";
import type { DocumentUploadEntry } from "../../types/upload.types";
import { UploadProgress } from "./upload-progress";

function upload(state: UploadState): DocumentUploadEntry {
  return {
    id: state,
    fileName: "report.pdf",
    sizeBytes: 128,
    state,
    progress: 100,
  };
}

test("successful uploads dismiss after the configured delay and cancel on queue changes or unmount", (context) => {
  const effects: React.EffectCallback[] = [];
  context.mock.method(React, "useState", (() => [
    false,
    () => {},
  ]) as typeof React.useState);
  context.mock.method(React, "useEffect", (effect: React.EffectCallback) => {
    effects.push(effect);
  });
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const dismiss = context.mock.fn();

  const render = (uploads: DocumentUploadEntry[]) => {
    UploadProgress({ uploads, onDismiss: dismiss });

    return effects.pop()!();
  };

  render([upload(UploadState.SUCCESS)]);
  context.mock.timers.tick(UPLOAD_SUCCESS_DISMISS_DELAY_MS - 1);
  assert.equal(dismiss.mock.callCount(), 0);
  context.mock.timers.tick(1);
  assert.equal(dismiss.mock.callCount(), 1);

  let cleanup = render([upload(UploadState.SUCCESS)]);
  context.mock.timers.tick(1000);
  if (typeof cleanup === "function") cleanup();
  render([upload(UploadState.SUCCESS), upload(UploadState.UPLOADING)]);
  context.mock.timers.tick(UPLOAD_SUCCESS_DISMISS_DELAY_MS);
  assert.equal(
    dismiss.mock.callCount(),
    1,
    "a new upload cancels the previous timer",
  );

  cleanup = render([upload(UploadState.SUCCESS)]);
  if (typeof cleanup === "function") cleanup();
  context.mock.timers.tick(UPLOAD_SUCCESS_DISMISS_DELAY_MS);
  assert.equal(dismiss.mock.callCount(), 1, "unmount cancels dismissal");
});

test("pending, skipped, failed, and empty queues stay visible without automatic dismissal", (context) => {
  const effects: React.EffectCallback[] = [];
  context.mock.method(React, "useState", (() => [
    false,
    () => {},
  ]) as typeof React.useState);
  context.mock.method(React, "useEffect", (effect: React.EffectCallback) => {
    effects.push(effect);
  });
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const dismiss = context.mock.fn();

  for (const state of Object.values(UploadState).filter(
    (state) => state !== UploadState.SUCCESS,
  )) {
    UploadProgress({
      uploads: [upload(UploadState.SUCCESS), upload(state)],
      onDismiss: dismiss,
    });
    effects.pop()!();
    context.mock.timers.tick(UPLOAD_SUCCESS_DISMISS_DELAY_MS);
    assert.equal(
      dismiss.mock.callCount(),
      0,
      `${state} must not dismiss the queue`,
    );
  }
  UploadProgress({ uploads: [], onDismiss: dismiss });
  effects.pop()!();
  context.mock.timers.tick(UPLOAD_SUCCESS_DISMISS_DELAY_MS);
  assert.equal(dismiss.mock.callCount(), 0);
});
