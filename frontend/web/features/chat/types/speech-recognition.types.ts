interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

export interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
}

export interface SpeechRecognitionHandle {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionHandle;
  webkitSpeechRecognition?: new () => SpeechRecognitionHandle;
};
