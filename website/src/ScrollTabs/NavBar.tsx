import { ReactNode, useRef } from "react";
import useScrollSpy from "./useScrollSpy";
import { Tabs, Tab } from "@mui/material";

export interface NavBarProps {
  items: ReadonlyArray<{ hash: string; label: ReactNode }>;
}

export const NavBar = ({ items }: NavBarProps) => {
  const clickedRef = useRef(false);
  const unsetClickedRef = useRef<NodeJS.Timeout | null>(null);
  const [active, setActive] = useScrollSpy(items, clickedRef);

  const tabsHTML = items.map(({ label, hash }, index) => (
    <Tab value={hash} key={index} label={label} />
  ));

  return (
    <Tabs
      value={active ? active : false}
      onChange={(_, hash: string) => {
        clickedRef.current = true; // Disable scrollSpy reacting to this scroll
        // Make sure we re-enable scrollSpy reacting to scrolls
        unsetClickedRef.current = setTimeout(() => {
          clickedRef.current = false;
        }, 1000);
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
      {tabsHTML}
    </Tabs>
  );
};
