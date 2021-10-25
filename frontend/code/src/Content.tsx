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
import * as common from "./common";

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
  const [contentHeigth, setContentHeigth] = useState<number>(0);
  const navRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const adjustSize = () => {
    const { current: contentElement } = contentRef;
    const { current: navElement } = navRef;
    if (contentElement && navElement) {
      setContentHeigth(
        contentElement.getBoundingClientRect().bottom -
          navElement.getBoundingClientRect().bottom,
      );
    }
  };
  useLayoutEffect(adjustSize, []); // Run this only once as we don't have any dynamic elements in UI
  common.useThrottledWindowListener("resize", adjustSize, 500);
  const zIndexMinus1: SxProps<typeof theme> = {
    zIndex: -1,
  };
  const topMostSxProps: SxProps<typeof theme> =
    contentHeigth > 0
      ? {
          ...zIndexMinus1,
          height: `${contentHeigth}px`,
        }
      : { ...zIndexMinus1 };
  return (
    <Box sx={{ ...topMostSxProps }}>
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
      <Box
        sx={{
          position: "absolute",
          top: 0,
          width: "100%",
        }}
        ref={contentRef}
      >
        <Container
          sx={{
            position: "static",
            background: `linear-gradient(${theme.palette.background.default}, ${theme.palette.primary.dark})`,
          }}
        >
          {tabs.map(({ component }, idx) => {
            const sx: SxProps<typeof theme> = {
              minHeight: "100vh",
              maxHeight: "100vh",
              position: "relative", // This is to allow to center content vertically
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            };
            return (
              <Box key={idx} id={getID(idx)} sx={sx} component="article">
                <Box
                  sx={{
                    // position: "absolute",
                    // top: "50%",
                    // textAlign: "center",
                    width: "100%",
                  }}
                >
                  {component}
                </Box>
              </Box>
            );
          })}
        </Container>
      </Box>
    </Box>
  );
};

export default Content;
