import { api } from "@/lib/axios";
import { normalizeApiResponse } from "@/features/chat/api/chat.api";
import type {
  MeetingRecording,
  RecordingLayout,
  RecordingPage,
  RecordingPermission,
  RecordingQuery,
  RecordingRoomStatus,
} from "../types/meeting-recording.types";

const root = "/api/meetings";
const file = (id: string) => `${root}/recordings/${encodeURIComponent(id)}`;
const room = (token: string) => `${root}/${encodeURIComponent(token)}`;

export const recordingApi = {
  status: async (token: string) =>
    normalizeApiResponse<RecordingRoomStatus>(
      (await api.get(`${room(token)}/recordings/status`)).data,
    ).data,
  start: async (token: string, layout: RecordingLayout, key: string) =>
    api.post(
      `${room(token)}/recordings`,
      { layout },
      { headers: { "Idempotency-Key": key } },
    ),
  stop: async (token: string, id: string, key: string) =>
    api.post(
      `${room(token)}/recordings/${encodeURIComponent(id)}/stop`,
      {},
      { headers: { "Idempotency-Key": key } },
    ),
  grant: async (token: string, userId: string, canRecord: boolean) =>
    api.patch(
      `${room(token)}/participants/${encodeURIComponent(userId)}/recording-permission`,
      { canRecord },
    ),
  list: async (params: RecordingQuery) =>
    normalizeApiResponse<RecordingPage>(
      (await api.get(`${root}/recordings`, { params })).data,
    ).data,
  detail: async (id: string) =>
    normalizeApiResponse<MeetingRecording>((await api.get(file(id))).data).data,
  url: async (id: string, download = false) =>
    normalizeApiResponse<{ url: string; expiresAt: string }>(
      (await api.post(`${file(id)}/${download ? "download" : "playback"}-url`))
        .data,
    ).data,
  rename: async (id: string, title: string) => api.patch(file(id), { title }),
  delete: async (id: string) => api.delete(file(id)),
  permissions: async (id: string) =>
    normalizeApiResponse<RecordingPermission[]>(
      (await api.get(`${file(id)}/permissions`)).data,
    ).data,
  share: async (id: string, userId: string, canDownload: boolean) =>
    api.put(`${file(id)}/permissions/${encodeURIComponent(userId)}`, {
      canView: true,
      canDownload,
    }),
  shareParticipants: async (id: string, canDownload: boolean) =>
    api.post(`${file(id)}/permissions/participants`, { canDownload }),
  revoke: async (id: string, userId: string) =>
    api.delete(`${file(id)}/permissions/${encodeURIComponent(userId)}`),
};
