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
  sections: ReadonlyArray<{
    label: ReactNode;
    component: ReactElement; // ElementType
  }>;
  header: ReactElement;
}

const Content = ({ tabGroupUniqueName, sections: tabs, header }: MainProps) => {
  const getID = (idx: number) => `tab-${tabGroupUniqueName}-${idx}`;
  const theme = useTheme();
  const [contentHeigth, setContentHeigth] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const adjustSize = () => {
    const { current: contentElement } = contentRef;
    if (contentElement) {
      setContentHeigth(contentElement.getBoundingClientRect().height);
    }
  };
  useLayoutEffect(adjustSize, []); // Run this only once as we don't have any dynamic elements in UI
  common.useThrottledWindowListener("resize", adjustSize, 500);

  // Some notes:
  // 1. The content should be absolutely positioned so that height and centering would work meaningfully
  // 2. The outermost box must have explicit height. If it doesn't, then the absolutely-positioned content will not be part of auto-calculated height -> the navbar will not float at the top of the page when scrolled.
  // 3. The content must come *before* anything else, because: "Elements in the same stacking context will display in order of appearance, with latter elements on top of former elements." ( from https://www.freecodecamp.org/news/4-reasons-your-z-index-isnt-working-and-how-to-fix-it-coder-coder-6bc05f103e6c/ ).
  //    This means that if header is before content, it will never be visible, no matter what CSS is applied.
  return (
    <Box sx={contentHeigth > 0 ? { height: `${contentHeigth}px` } : undefined}>
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
      {header}
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
        }}
        component="nav"
      >
        <NavBar
          items={tabs.map(({ label }, idx) => ({
            hash: getID(idx),
            label,
          }))}
        />
      </Container>
    </Box>
  );
};

export default Content;
