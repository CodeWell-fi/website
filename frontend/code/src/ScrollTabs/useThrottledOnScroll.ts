import { useEffect, useMemo } from "react";
import throttle from "lodash/throttle";
import { DebouncedFunc } from "lodash";

export type Callback = () => void;

const useThrottledOnScroll = (callback: Callback | null, delay: number) => {
  const throttledCallback = useMemo(
    () => (callback ? throttle(callback, delay) : noop),
    [callback, delay],
  );

  useEffect(() => {
    if (throttledCallback === noop) {
      return undefined;
    }

    window.addEventListener("scroll", throttledCallback);
    return () => {
      window.removeEventListener("scroll", throttledCallback);
      (throttledCallback as DebouncedFunc<Callback>).cancel();
    };
  }, [throttledCallback]);
};

const noop = () => {};

export default useThrottledOnScroll;
