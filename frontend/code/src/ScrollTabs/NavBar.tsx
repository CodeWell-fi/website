import { ReactNode, useRef, useEffect } from "react";
import useScrollSpy from "./useScrollSpy";
import { Tabs, Tab } from "@mui/material";

export interface NavBarProps {
  items: ReadonlyArray<{ hash: string; label: ReactNode }>;
}

export const NavBar = ({ items }: NavBarProps) => {
  const clickedRef = useRef(false);
  const unsetClickedRef = useRef<number | null>(null);
  const [active, setActive] = useScrollSpy(items, clickedRef);

  useEffect(
    () => () => {
      if (unsetClickedRef.current) {
        clearTimeout(unsetClickedRef.current);
      }
    },
    [],
  );

  return (
    <Tabs
      value={active ? active : false}
      onChange={(_, hash: string) => {
        clickedRef.current = true; // Disable scrollSpy reacting to this scroll
        // Make sure we re-enable scrollSpy reacting to scrolls
        unsetClickedRef.current = setTimeout(
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          (() => {
            clickedRef.current = false;
          }) as TimerHandler, // We must use this in order for compiler not to get confused with Node's setTimeout which is visible because of CRA.
          1000,
        );
        // Perform scroll
        if (active !== hash) {
          setActive(hash);
          if (window) {
            const target = document.getElementById(hash);
            if (target) {
              window.scrollTo({
                top: target.getBoundingClientRect().top + window.pageYOffset,
                behavior: "smooth",
              });
            }
          }
        }
      }}
    >
      {items.map(({ label, hash }, index) => (
        <Tab value={hash} key={index} label={label} aria-controls={hash} />
      ))}
    </Tabs>
  );
};
