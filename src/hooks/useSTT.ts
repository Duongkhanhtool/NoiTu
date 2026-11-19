/**
 * React hook for Speech-to-Text (voice input).
 *
 * Creates an STTService instance on mount, tracks transcript state,
 * and cleans up on unmount.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { STTService } from '../lib/stt';

export function useSTT() {
  const svcRef = useRef<STTService | null>(null);
  const isMounted = useRef(true);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  // Create service on mount
  useEffect(() => {
    isMounted.current = true;
    const svc = new STTService();
    svcRef.current = svc;
    setIsSupported(svc.isSupported());

    return () => {
      isMounted.current = false;
      svc.destroy();
      svcRef.current = null;
    };
  }, []);

  const startListening = useCallback((onFinalResult?: (text: string) => void) => {
    const svc = svcRef.current;
    if (!svc || !svc.isSupported()) return;

    // Reset transcripts
    setTranscript('');
    setInterimTranscript('');

    svc.start({
      onResult: (text, isFinal) => {
        if (!isMounted.current) return;
        if (isFinal) {
          setTranscript(text);
          setInterimTranscript('');
          onFinalResult?.(text);
        } else {
          setInterimTranscript(text);
        }
      },
      onError: (message) => {
        if (!isMounted.current) return;
        console.warn('[STT]', message);
        setIsListening(false);
      },
      onEnd: () => {
        if (!isMounted.current) return;
        setIsListening(false);
      },
    });

    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    svcRef.current?.stop();
    if (isMounted.current) setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    startListening,
    stopListening,
    clearTranscript,
    isListening,
    isSupported,
    transcript,
    interimTranscript,
  };
}
