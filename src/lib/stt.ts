/**
 * Speech-to-Text service for Vietnamese voice input.
 *
 * Uses the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 *
 * Configuration:
 * - lang: "vi-VN"
 * - continuous: false (stop after one phrase)
 * - interimResults: true (show partial results while speaking)
 *
 * Browser support:
 * - Chrome / Edge: webkitSpeechRecognition (good Vietnamese support)
 * - Safari: SpeechRecognition (decent)
 * - Firefox: NOT SUPPORTED — the UI should show a text-input fallback
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

  constructor() {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      // Browser does not support speech recognition
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

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Get the latest result
      const resultIndex = event.resultIndex;
      const result = event.results[resultIndex];

      if (result) {
        const transcript = result[0].transcript.trim();
        const isFinal = result.isFinal;
        callbacks.onResult(transcript, isFinal);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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
}
