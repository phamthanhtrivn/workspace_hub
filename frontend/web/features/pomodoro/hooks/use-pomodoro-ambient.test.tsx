// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePomodoroAmbient } from "./use-pomodoro-ambient";
import { ambientAudio } from "../utils/ambient-audio";
import { deleteCustomAudioTrack, loadCustomAudioTracks, saveCustomAudioTrack } from "../utils/audio-storage";

vi.mock("../utils/ambient-audio", () => ({ ambientAudio: { setTrack: vi.fn(), setVolume: vi.fn(), setPlaybackListener: vi.fn(), pause: vi.fn(), play: vi.fn(), stop: vi.fn() } }));
vi.mock("../utils/audio-storage", () => ({ loadCustomAudioTracks: vi.fn().mockResolvedValue([]), saveCustomAudioTrack: vi.fn(), deleteCustomAudioTrack: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("stops audio when leaving the account view", () => {
  const { unmount } = renderHook(() => usePomodoroAmbient("RUNNING", "user-a"));
  unmount();
  expect(ambientAudio.pause).toHaveBeenCalled();
  expect(ambientAudio.setPlaybackListener).toHaveBeenLastCalledWith(null);
});

it("scopes custom audio reads, uploads and deletion to the current account", async () => {
  const file = new File(["audio"], "private.wav", { type: "audio/wav" });
  vi.mocked(saveCustomAudioTrack).mockResolvedValue({ id: "custom_1", name: "private", size: 5, url: "blob:private", createdAt: 1 });
  const { result } = renderHook(() => usePomodoroAmbient("IDLE", "user-b"));
  await waitFor(() => expect(loadCustomAudioTracks).toHaveBeenCalledWith("user-b"));
  await act(async () => { await result.current.uploadCustomTrack(file); });
  expect(saveCustomAudioTrack).toHaveBeenCalledWith("user-b", file);
  await act(async () => { await result.current.removeCustomTrack("custom_1"); });
  expect(deleteCustomAudioTrack).toHaveBeenCalledWith("user-b", "custom_1");
  expect(result.current.customTracks).toEqual([]);
});
