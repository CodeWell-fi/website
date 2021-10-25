import { useEffect, useMemo } from "react";
import throttle from "lodash/throttle";
import { DebouncedFunc } from "lodash";

export type Callback = () => void;

export const useThrottledWindowListener = <K extends keyof WindowEventMap>(
  event: K,
  callback: Callback | null,
  delay: number,
) => {
  const throttledCallback = useMemo(
    () => (callback ? throttle(callback, delay) : noop),
    [callback, delay],
  );

  useEffect(() => {
    if (throttledCallback === noop) {
      return undefined;
    }

    window.addEventListener(event, throttledCallback);
    return () => {
      window.removeEventListener(event, throttledCallback);
      (throttledCallback as DebouncedFunc<Callback>).cancel();
    };
  }, [event, throttledCallback]);
};

const noop = () => {};
