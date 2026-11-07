import type { AmbientTrackId } from "../types/ambient";
import { getStorageAccess, isPrivateStorageReference, type StorageAccess } from "@/features/storage/api/storage.api";

export class AmbientAudioManager {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrackId: AmbientTrackId = "none";
  private currentUrl: string | null = null;
  private access: StorageAccess | null = null;
  private volume = 0.5;
  private isPlayingState = false;
  private playbackVersion = 0;
  private playbackListener: ((isPlaying: boolean) => void) | null = null;
  private errorListener: (() => void) | null = null;

  private getAudioElement(): HTMLAudioElement | null {
    if (!this.audioElement && typeof window !== "undefined") {
      this.audioElement = new Audio();
      this.audioElement.loop = true;
      this.audioElement.preload = "none";
      this.audioElement.addEventListener("error", () => {
        ++this.playbackVersion;
        this.setPlaying(false);
        if (this.currentTrackId !== "none") this.errorListener?.();
      });
    }
    return this.audioElement;
  }

  public getTrackId(): AmbientTrackId { return this.currentTrackId; }
  public getIsPlaying(): boolean { return this.isPlayingState; }
  public getVolume(): number { return this.volume; }

  public setPlaybackListener(listener: ((isPlaying: boolean) => void) | null) {
    this.playbackListener = listener;
    listener?.(this.isPlayingState);
  }

  public setErrorListener(listener: (() => void) | null) { this.errorListener = listener; }

  private setPlaying(isPlaying: boolean) {
    this.isPlayingState = isPlaying;
    this.playbackListener?.(isPlaying);
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audioElement) this.audioElement.volume = this.volume;
  }

  public setTrack(trackId: AmbientTrackId, url?: string) {
    const nextUrl = trackId === "none" ? null : url ?? null;
    if (this.currentTrackId === trackId && this.currentUrl === nextUrl) return;
    this.stop();
    this.currentTrackId = trackId;
    this.currentUrl = nextUrl;
    this.access = null;
    if (this.audioElement) {
      this.audioElement.removeAttribute("src");
      this.audioElement.load();
    }
  }

  public async play(): Promise<void> {
    const audio = this.getAudioElement();
    if (this.currentTrackId === "none" || !this.currentUrl || !audio) return;
    const version = ++this.playbackVersion;
    try {
      let url = this.currentUrl;
      if (isPrivateStorageReference(url)) {
        if (!this.access || Date.parse(this.access.expiresAt) < Date.now() + 15_000 || audio.error) {
          this.access = await getStorageAccess(url);
        }
        url = this.access.url;
      }
      if (version !== this.playbackVersion) return;
      if (audio.getAttribute("src") !== url || audio.error) {
        audio.src = url;
        audio.load();
      }
      audio.volume = this.volume;
      await audio.play();
      if (version === this.playbackVersion) this.setPlaying(true);
    } catch {
      if (version !== this.playbackVersion) return;
      this.setPlaying(false);
      this.errorListener?.();
    }
  }

  public pause() {
    ++this.playbackVersion;
    this.audioElement?.pause();
    this.setPlaying(false);
  }

  public stop() {
    this.pause();
    if (this.audioElement && this.audioElement.readyState > 0) this.audioElement.currentTime = 0;
  }
}

export const ambientAudio = new AmbientAudioManager();
