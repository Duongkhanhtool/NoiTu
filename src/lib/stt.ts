/**
 * Speech-to-Text service for Vietnamese voice input.
 *
 * Uses the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 *
 * Safari iOS quirks handled:
 * - isFinal may not fire reliably → we auto-submit on final OR on silence timeout
 * - onend may fire before final result → we track final result separately
 * - continuous:false may not stop cleanly → we force stop + callback
 */

import type { ISpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types/speech';

export interface STTCallbacks {
  /** Fired with each recognition result (interim or final). */
  onResult: (transcript: string, isFinal: boolean) => void;
  /** Fired on recognition error. */
  onError: (error: string) => void;
  /** Fired when recognition ends (regardless of reason). */
  onEnd: () => void;
}

export class STTService {
  private recognition: ISpeechRecognition | null = null;
  private isListening: boolean = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTranscript: string = '';
  private gotFinalResult: boolean = false;

  constructor() {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      return;
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.lang = 'vi-VN';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
  }

  /** Whether the browser supports speech recognition. */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  /** Whether the service is currently listening. */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Start listening for speech input.
   *
   * @param callbacks  Handlers for results, errors, and end events.
   */
  start(callbacks: STTCallbacks): void {
    if (!this.recognition) {
      callbacks.onError('Trình duyệt không hỗ trợ nhận diện giọng nói.');
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.lastTranscript = '';
    this.gotFinalResult = false;
    this.clearSilenceTimer();

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const resultIndex = event.resultIndex;
      const result = event.results[resultIndex];

      if (result) {
        const transcript = result[0].transcript.trim();
        const isFinal = result.isFinal;

        this.lastTranscript = transcript;
        callbacks.onResult(transcript, isFinal);

        if (isFinal) {
          // Got a final result — mark it and stop
          this.gotFinalResult = true;
          this.clearSilenceTimer();
          // Force stop after a short delay to let Safari settle
          setTimeout(() => {
            if (this.isListening) {
              this.isListening = false;
              try { this.recognition?.stop(); } catch {}
              callbacks.onEnd();
            }
          }, 100);
        } else {
          // Got interim result — reset silence timer
          // If no final result comes within 2.5s of last interim, treat as final
          this.resetSilenceTimer(() => {
            if (this.isListening && this.lastTranscript && !this.gotFinalResult) {
              // Silence timeout — treat last interim as final
              callbacks.onResult(this.lastTranscript, true);
              this.gotFinalResult = true;
              this.isListening = false;
              try { this.recognition?.stop(); } catch {}
              callbacks.onEnd();
            }
          });
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.clearSilenceTimer();
      const errorMessages: Record<string, string> = {
        'no-speech': 'Không nghe thấy giọng nói. Thử lại nhé!',
        'audio-capture': 'Không thể truy cập micro. Kiểm tra quyền truy cập.',
        'not-allowed': 'Quyền sử dụng micro bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.',
        'network': 'Lỗi mạng. Kiểm tra kết nối internet.',
        'aborted': 'Đã dừng nhận diện.',
        'service-not-allowed': 'Dịch vụ nhận diện giọng nói không khả dụng.',
      };

      const message = errorMessages[event.error] ?? `Lỗi nhận diện: ${event.error}`;
      callbacks.onError(message);
    };

    this.recognition.onend = () => {
      this.clearSilenceTimer();
      // If we already got a final result + called onEnd, skip
      if (!this.isListening) return;

      // Safari sometimes fires onend without a final result
      // If we have a transcript, treat it as final
      if (this.lastTranscript && !this.gotFinalResult) {
        callbacks.onResult(this.lastTranscript, true);
        this.gotFinalResult = true;
      }

      this.isListening = false;
      callbacks.onEnd();
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch {
      callbacks.onError('Không thể khởi động nhận diện giọng nói.');
    }
  }

  /** Stop listening. */
  stop(): void {
    this.clearSilenceTimer();
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore — may already be stopped
      }
      this.isListening = false;
    }
  }

  /** Abort listening immediately (discards any pending results). */
  abort(): void {
    this.clearSilenceTimer();
    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.isListening = false;
    }
  }

  /** Clean up — call when unmounting. */
  destroy(): void {
    this.abort();
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition.onstart = null;
    }
  }

  // ── Silence timer ──

  private resetSilenceTimer(onSilence: () => void): void {
    this.clearSilenceTimer();
    // 2.5 seconds of no new results → treat as done
    this.silenceTimer = setTimeout(onSilence, 2500);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}
