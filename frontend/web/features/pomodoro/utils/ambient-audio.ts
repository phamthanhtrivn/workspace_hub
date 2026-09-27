import type { AmbientTrackId } from "../types/ambient";
import { AMBIENT_TRACKS } from "../types/ambient";

class AmbientAudioManager {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrackId: AmbientTrackId = "none";
  private currentCustomUrl: string | null = null;
  private volume: number = 0.5;
  private isPlayingState: boolean = false;

  // Web Audio Context for Procedural Synthesis (Alpha Drone)
  private audioCtx: AudioContext | null = null;
  private droneGainNode: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.audioElement = new Audio();
      this.audioElement.loop = true;
      this.audioElement.preload = "auto";
    }
  }

  public getTrackId(): AmbientTrackId {
    return this.currentTrackId;
  }

  public getIsPlaying(): boolean {
    return this.isPlayingState;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(newVolume: number) {
    this.volume = Math.max(0, Math.min(1, newVolume));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    if (this.droneGainNode && this.audioCtx) {
      try {
        this.droneGainNode.gain.setValueAtTime(
          this.volume * 0.15,
          this.audioCtx.currentTime,
        );
      } catch {
        // ignore
      }
    }
  }

  public setTrack(trackId: AmbientTrackId, customUrl?: string) {
    if (this.currentTrackId === trackId && (!customUrl || customUrl === this.currentCustomUrl)) {
      return;
    }

    const wasPlaying = this.isPlayingState;
    this.stop();

    this.currentTrackId = trackId;
    this.currentCustomUrl = customUrl || null;

    if (wasPlaying && trackId !== "none") {
      this.play();
    }
  }

  public async play() {
    if (this.currentTrackId === "none") {
      this.stop();
      return;
    }

    // Custom user track from device
    if (this.currentTrackId.startsWith("custom_") && this.currentCustomUrl && this.audioElement) {
      try {
        if (this.audioElement.src !== this.currentCustomUrl) {
          this.audioElement.src = this.currentCustomUrl;
          this.audioElement.load();
        }
        this.audioElement.volume = this.volume;
        await this.audioElement.play();
        this.isPlayingState = true;
      } catch (err) {
        console.warn("Autoplay was blocked or custom audio failed to play:", err);
        this.isPlayingState = false;
      }
      return;
    }

    // Predefined tracks
    const track = AMBIENT_TRACKS.find((t) => t.id === this.currentTrackId);
    if (!track) return;

    if (track.isProcedural) {
      this.startProceduralAlphaDrone();
      this.isPlayingState = true;
    } else if (track.url && this.audioElement) {
      try {
        if (this.audioElement.src !== track.url) {
          this.audioElement.src = track.url;
          this.audioElement.load();
        }
        this.audioElement.volume = this.volume;
        await this.audioElement.play();
        this.isPlayingState = true;
      } catch (err) {
        console.warn("Autoplay was blocked or audio failed to load:", err);
        this.isPlayingState = false;
      }
    }
  }

  public pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopProceduralAlphaDrone();
    this.isPlayingState = false;
  }

  public stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.stopProceduralAlphaDrone();
    this.isPlayingState = false;
  }

  // ---------------------------------------------------------------------------
  // Procedural Web Audio: 432Hz Alpha Deep Focus Drone
  // ---------------------------------------------------------------------------
  private startProceduralAlphaDrone() {
    this.stopProceduralAlphaDrone();
    if (typeof window === "undefined") return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      const ctx = this.audioCtx;

      // Master Gain for Drone
      this.droneGainNode = ctx.createGain();
      this.droneGainNode.gain.setValueAtTime(0.001, ctx.currentTime);
      this.droneGainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.001, this.volume * 0.15),
        ctx.currentTime + 1.5,
      );
      this.droneGainNode.connect(ctx.destination);

      // Low Pass filter for cozy warm sound
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.connect(this.droneGainNode);

      // Frequencies around 432Hz chord (Root 108Hz, 216Hz, 432Hz, and 439Hz for a soothing 7Hz binaural alpha beat)
      const frequencies = [108, 216, 432, 439];

      this.droneOscillators = frequencies.map((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(filter);
        osc.start();
        return osc;
      });
    } catch (err) {
      console.warn("Could not start procedural audio drone:", err);
    }
  }

  private stopProceduralAlphaDrone() {
    if (this.droneOscillators.length > 0) {
      this.droneOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      this.droneOscillators = [];
    }

    if (this.droneGainNode) {
      try {
        this.droneGainNode.disconnect();
      } catch {
        // ignore
      }
      this.droneGainNode = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }
  }
}

export const ambientAudio = new AmbientAudioManager();
