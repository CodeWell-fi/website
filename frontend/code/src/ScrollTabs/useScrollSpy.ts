import {
  useState,
  useEffect,
  useRef,
  useCallback,
  MutableRefObject,
} from "react";
import * as common from "../common";

export interface ScrollSpyItem {
  hash: string;
}

export type ScrollSpyItemElement = ScrollSpyItem & {
  node: HTMLElement | null;
};

const useScrollSpy = (
  items: ReadonlyArray<ScrollSpyItem>,
  clickedRef?: MutableRefObject<boolean>,
) => {
  const itemsWithNodeRef = useRef<Array<ScrollSpyItemElement>>([]);
  useEffect(() => {
    itemsWithNodeRef.current = getItemsClient(items);
  }, [items]);

  const [activeState, setActiveState] = useState<string | undefined>(
    items[0]?.hash,
  );

  const findActiveIndex = useCallback(() => {
    // Don't set the active index based on scroll if a link was just clicked
    if (clickedRef?.current !== true) {
      const active = tryFindActive(itemsWithNodeRef.current);

      if (active && activeState !== active.hash) {
        setActiveState(active.hash);
      }
    }
  }, [activeState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Corresponds to 10 frames at 60 Hz
  common.useThrottledWindowListener(
    "scroll",
    items.length > 0 ? findActiveIndex : null,
    166,
  );

  return [activeState, setActiveState] as const;
};

const getItemsClient = (items: ReadonlyArray<ScrollSpyItem>) =>
  items.map(({ hash }) => ({ hash, node: document.getElementById(hash) }));

const tryFindActive = (elements: ReadonlyArray<ScrollSpyItemElement>) => {
  let active: ScrollSpyItem | undefined;
  if (document.documentElement.scrollTop >= 200) {
    // No hash if we're near the top of the page
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const item = elements[i];

      if (process.env.NODE_ENV !== "production" && !item.node) {
        // eslint-disable-next-line no-console
        console.error(
          `Missing node on the item ${JSON.stringify(item, null, 2)}`,
        );
      }

      if (
        item.node &&
        item.node.offsetTop <
          document.documentElement.scrollTop +
            document.documentElement.clientHeight / 5
      ) {
        active = item;
        break;
      }
    }
  }

  return active;
};

export default useScrollSpy;
