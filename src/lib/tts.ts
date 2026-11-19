/**
 * Text-to-Speech service for Vietnamese.
 *
 * TWO engines, selectable via `setSource()`:
 *
 * 1. **google** (default) — Google Translate TTS via local proxy server.
 *    Very natural Vietnamese pronunciation. Proxy at localhost:3001
 *    handles CORS and streams the audio back.
 *
 * 2. **browser** — Native Web Speech API (SpeechSynthesis).
 *    Quality depends on installed OS voices.
 */

export type TTSSource = 'google' | 'browser';

import { PROXY_URL } from './proxy-config';

export class TTSService {
  private source: TTSSource = 'google';
  private rate: number = 0.8;
  private speaking: boolean = false;

  // Google TTS (via proxy)
  private audioElement: HTMLAudioElement | null = null;

  // Browser TTS
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private voicesLoaded: boolean = false;
  private onVoicesReady: (() => void)[] = [];

  // Anti-double-speak: increment on each speak call, check before playing
  private speakId: number = 0;

  constructor() {
    if (typeof window === 'undefined') return;

    this.audioElement = new Audio();
    this.audioElement.volume = 1.0;

    if (window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      const tryLoadVoices = () => {
        const voices = this.synth!.getVoices();
        if (voices.length > 0) {
          this.voicesLoaded = true;
          this.voice = this.findVietnameseVoice();
          this.onVoicesReady.forEach((cb) => cb());
          this.onVoicesReady = [];
        }
      };
      tryLoadVoices();
      if (!this.voicesLoaded) {
        this.synth.addEventListener('voiceschanged', tryLoadVoices);
      }
    }
  }

  isSupported(): boolean {
    return this.audioElement !== null || this.synth !== null;
  }

  getSource(): TTSSource {
    return this.source;
  }

  setSource(source: TTSSource): void {
    if (this.source !== source) {
      this.cancel();
      this.source = source;
    }
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(1.5, rate));
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  speak(text: string, onEnd?: () => void): void {
    // Cancel anything in progress first
    this.cancel();

    if (this.source === 'google') {
      this.speakGoogle(text, onEnd);
    } else {
      this.speakBrowser(text, onEnd);
    }
  }

  cancel(): void {
    // Bump speakId to invalidate any in-flight callbacks
    this.speakId++;
    this.speaking = false;

    // Stop audio element
    if (this.audioElement) {
      this.audioElement.onended = null;
      this.audioElement.onerror = null;
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement.removeAttribute('src');
    }

    // Stop browser TTS
    this.synth?.cancel();
  }

  // ── Google TTS (via proxy) ──

  private speakGoogle(text: string, onEnd?: () => void): void {
    if (!this.audioElement) {
      this.speakBrowser(text, onEnd);
      return;
    }

    this.speaking = true;
    const myId = this.speakId; // Capture current ID

    const chunks = this.chunkText(text, 180);
    let currentChunk = 0;
    let didFallback = false;

    const playNextChunk = () => {
      // Bail if a newer speak() was called
      if (this.speakId !== myId) return;

      if (currentChunk >= chunks.length) {
        this.speaking = false;
        onEnd?.();
        return;
      }

      const encoded = encodeURIComponent(chunks[currentChunk]);
      const url = `${PROXY_URL}/tts?text=${encoded}`;
      this.audioElement!.src = url;

      this.audioElement!.onended = () => {
        if (this.speakId !== myId) return;
        currentChunk++;
        if (currentChunk < chunks.length) {
          setTimeout(playNextChunk, 100);
        } else {
          this.speaking = false;
          onEnd?.();
        }
      };

      this.audioElement!.onerror = () => {
        if (this.speakId !== myId || didFallback) return;
        didFallback = true;
        console.warn('Google TTS proxy failed, falling back to browser TTS');
        // Clean up audio element before fallback
        this.audioElement!.onended = null;
        this.audioElement!.onerror = null;
        this.speaking = false;
        this.speakBrowser(text, onEnd);
      };

      this.audioElement!.play().catch(() => {
        if (this.speakId !== myId || didFallback) return;
        didFallback = true;
        console.warn('Audio play blocked, falling back to browser TTS');
        // Clean up audio element before fallback
        this.audioElement!.onended = null;
        this.audioElement!.onerror = null;
        this.speaking = false;
        this.speakBrowser(text, onEnd);
      });
    };

    playNextChunk();
  }

  private chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }
      let splitAt = remaining.lastIndexOf(' ', maxLength);
      if (splitAt <= 0) splitAt = maxLength;
      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }
    return chunks;
  }

  // ── Browser TTS ──

  findVietnameseVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    for (const keyword of ['Microsoft', 'Google']) {
      const match = voices.find(
        (v) => v.lang === 'vi-VN' && v.name.includes(keyword),
      );
      if (match) return match;
    }
    return (
      voices.find((v) => v.lang === 'vi-VN') ??
      voices.find((v) => v.lang.startsWith('vi')) ??
      null
    );
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  getVietnameseVoices(): SpeechSynthesisVoice[] {
    return this.getVoices().filter((v) => v.lang.startsWith('vi'));
  }

  setVoice(voiceURI: string | null): void {
    if (!voiceURI) {
      this.voice = this.findVietnameseVoice();
      return;
    }
    const match = this.getVoices().find((v) => v.voiceURI === voiceURI);
    this.voice = match ?? this.findVietnameseVoice();
  }

  waitForVoices(): Promise<void> {
    if (this.voicesLoaded) return Promise.resolve();
    return new Promise((resolve) => {
      this.onVoicesReady.push(resolve);
      setTimeout(resolve, 3000);
    });
  }

  private speakBrowser(text: string, onEnd?: () => void): void {
    if (!this.synth) {
      onEnd?.();
      return;
    }
    this.synth.cancel();
    this.speaking = true;
    const myId = this.speakId;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = this.rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (this.voice) utterance.voice = this.voice;

    utterance.onend = () => {
      if (this.speakId !== myId) return;
      this.speaking = false;
      onEnd?.();
    };
    utterance.onerror = () => {
      if (this.speakId !== myId) return;
      this.speaking = false;
      onEnd?.();
    };

    this.synth.speak(utterance);
  }
}

let instance: TTSService | null = null;

export function getTTSService(): TTSService {
  if (!instance) instance = new TTSService();
  return instance;
}
