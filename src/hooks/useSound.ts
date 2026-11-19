/**
 * React hook for sound effects.
 *
 * Wraps the singleton SoundService and keeps its enabled state
 * in sync with the settings prop.
 */

import { useEffect, useMemo, useCallback } from 'react';
import { getSoundService } from '../lib/sound';

export function useSound(enabled: boolean) {
  const svc = useMemo(() => getSoundService(), []);

  // Keep enabled state in sync
  useEffect(() => {
    svc.setEnabled(enabled);
  }, [svc, enabled]);

  const playCorrect = useCallback(() => svc.play('correct'), [svc]);
  const playWrong = useCallback(() => svc.play('wrong'), [svc]);
  const playTurn = useCallback(() => svc.play('turn'), [svc]);
  const playWin = useCallback(() => svc.play('win'), [svc]);
  const playTick = useCallback(() => svc.play('tick'), [svc]);

  return { playCorrect, playWrong, playTurn, playWin, playTick };
}
