import {
  ReactNode,
  ReactElement,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { Box, Container, useTheme } from "@mui/material";
import { NavBar } from "./ScrollTabs";
import { SxProps } from "@mui/system";

interface MainProps {
  tabGroupUniqueName: string;
  tabs: ReadonlyArray<{
    label: ReactNode;
    component: ReactElement; // ElementType
  }>;
}

const Content = ({ tabGroupUniqueName, tabs }: MainProps) => {
  const getID = (idx: number) => `tab-${tabGroupUniqueName}-${idx}`;
  const theme = useTheme();
  const navRef = useRef<HTMLElement>(null);
  const [topBarOffset, setTopBarOffset] = useState<number | undefined>(
    undefined,
  );
  useLayoutEffect(() => {
    const { current: navElement } = navRef;
    if (navElement) {
      setTopBarOffset(navElement.getBoundingClientRect().bottom);
    }
  }, []); // Run this only once as we don't have any dynamic elements in UI
  return (
    <Container sx={{ width: "100%" }}>
      <Container
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          backgroundColor: theme.palette.primary.light,
          zIndex: 1, // This is to avoid tab contents to go over navbar when scrolling
        }}
        component="nav"
        ref={navRef}
      >
        <NavBar
          items={tabs.map(({ label }, idx) => ({
            hash: getID(idx),
            label,
          }))}
        />
      </Container>
      <Container
        sx={{
          background: `linear-gradient(${theme.palette.background.default}, ${theme.palette.primary.dark})`,
        }}
      >
        {tabs.map(({ component }, idx) => {
          const sx: SxProps<typeof theme> = {
            minHeight: "100vh",
            position: "relative", // This is to allow to center content vertically
          };
          if (idx === 0 && topBarOffset !== undefined) {
            // This will position the first tab at the top of the page.
            sx.top = `${-topBarOffset}px`;
          }
          return (
            <Box key={idx} id={getID(idx)} sx={sx} component="article">
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                }}
              >
                {component}
              </Box>
            </Box>
          );
        })}
      </Container>
    </Container>
  );
};

export default Content;
