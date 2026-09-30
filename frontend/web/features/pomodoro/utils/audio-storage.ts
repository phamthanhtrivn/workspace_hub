const DB_NAME = "workspace_hub_pomodoro_audio";
const STORE_NAME = "custom_tracks";
const DB_VERSION = 1;

export interface CustomTrackRecord {
  id: string;
  name: string;
  size: number;
  url: string;
  createdAt: number;
}

interface StoredTrackEntity {
  id: string;
  name: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

function openAudioDatabase(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!userId || typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB is not supported"));
    }

    const request = indexedDB.open(`${DB_NAME}:${userId}`, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomAudioTrack(userId: string, file: File): Promise<CustomTrackRecord> {
  const db = await openAudioDatabase(userId);
  const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanName = file.name.replace(/\.[^/.]+$/, ""); // Strip file extension

  const entity: StoredTrackEntity = {
    id,
    name: cleanName,
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entity);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  const url = URL.createObjectURL(file);

  return {
    id,
    name: cleanName,
    size: file.size,
    url,
    createdAt: entity.createdAt,
  };
}

export async function loadCustomAudioTracks(userId: string): Promise<CustomTrackRecord[]> {
  try {
    const db = await openAudioDatabase(userId);
    const entities = await new Promise<StoredTrackEntity[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    return entities.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      url: URL.createObjectURL(item.blob),
      createdAt: item.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function deleteCustomAudioTrack(userId: string, id: string): Promise<void> {
  try {
    const db = await openAudioDatabase(userId);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}
