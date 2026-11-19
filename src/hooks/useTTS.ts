/**
 * React hook for Text-to-Speech.
 *
 * Wraps the singleton TTSService. Updates voice and rate from settings,
 * waits for browser voices to load, and cleans up on unmount.
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { getTTSService } from '../lib/tts';

export function useTTS(enabled: boolean, rate: number) {
  const svc = useMemo(() => getTTSService(), []);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isMounted = useRef(true);

  // Cleanup flag
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      svc.cancel();
    };
  }, [svc]);

  // Wait for voices then apply rate
  useEffect(() => {
    svc.waitForVoices();
  }, [svc]);

  // Keep rate in sync
  useEffect(() => {
    svc.setRate(rate);
  }, [svc, rate]);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!enabled || !svc.isSupported()) {
        onEnd?.();
        return;
      }
      setIsSpeaking(true);
      svc.speak(text, () => {
        if (isMounted.current) setIsSpeaking(false);
        onEnd?.();
      });
    },
    [svc, enabled],
  );

  const cancel = useCallback(() => {
    svc.cancel();
    if (isMounted.current) setIsSpeaking(false);
  }, [svc]);

  return { speak, cancel, isSpeaking, isSupported: svc.isSupported() };
}
