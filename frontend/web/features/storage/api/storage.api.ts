import { api } from "@/lib/axios";
import { isLegacyStorageUrl, isPrivateStorageReference, parseStorageUrl } from "../types/storage-reference";
export { isLegacyStorageUrl, isPrivateStorageReference } from "../types/storage-reference";

export interface StorageAccess { url: string; expiresAt: string }

export async function getStorageAccess(reference: string, signal?: AbortSignal): Promise<StorageAccess> {
  if (!isPrivateStorageReference(reference)) throw new Error("Invalid private storage reference");
  const response = await api.get<{ data: StorageAccess }>(reference, { signal });
  const access = response.data.data;
  const url = parseStorageUrl(access.url);
  const assetHost = process.env.NEXT_PUBLIC_ASSET_HOST;
  if (url.protocol !== "https:" || url.username || url.password || !url.searchParams.has("X-Amz-Signature") ||
      (assetHost && url.hostname !== assetHost) || !(Date.parse(access.expiresAt) > Date.now())) {
    throw new Error("Invalid storage access response");
  }
  return access;
}

export async function resolveStorageUrl(source: string, signal?: AbortSignal): Promise<string> {
  if (isLegacyStorageUrl(source)) throw new Error("This file belongs to the previous storage configuration");
  return isPrivateStorageReference(source) ? (await getStorageAccess(source, signal)).url : parseStorageUrl(source).href;
}

export async function fetchStorageAsset(source: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(await resolveStorageUrl(source, signal), { signal });
  if (!response.ok) throw new Error("File is unavailable");
  return response;
}

export async function openStorageAsset(source: string) {
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    const url = await resolveStorageUrl(source);
    if (tab) tab.location.replace(url);
  } catch (error) { tab?.close(); throw error; }
}
