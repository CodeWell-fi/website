import { useRef, useState, useLayoutEffect } from "react";
import { Box, Container, Typography, useTheme } from "@mui/material";
import { SxProps } from "@mui/system";
import { keyframes } from "@emotion/react";

const getKeyframes = (direction: "down" | "up" | "left" | "right") => keyframes`
0% {
  opacity: 1;
}

70% {
  transform: translate${
    direction === "down" || direction === "up" ? "Y" : "X"
  }(${direction === "down" ? "" : "-"}5%);
}

100% {
  transform: translate${
    direction === "down" || direction === "up" ? "Y" : "X"
  }(0);
  opacity: 1;
}
`;

export interface HeaderProps {
  label: string;
  verticalAnimationText: string;
  horizontalAnimationText: string;
}
const Header = ({
  label,
  verticalAnimationText,
  horizontalAnimationText,
}: HeaderProps) => {
  const level = 1;
  const variant = `h${level}` as const;

  const theme = useTheme();
  const leftSlideElementRef = useRef<HTMLElement>(null);
  const downSlideElementRef = useRef<HTMLElement>(null);
  const [overlapBoxSx, setOverlapBoxSx] = useState<SxProps<
    typeof theme
  > | null>(null);

  // Overlap box is only to avoid the horizontal animation text just suddenly appearing and starting moving. By having high z-index element filling the remainder of horizontal space and with solid bg color, it will look like the text is sliding from under the element.
  // Overlap box states:
  // 1. initial -> with useLayoutEffect, set it beginning where second typography starts
  // 2. animation end -> delete box
  useLayoutEffect(() => {
    const { current: leftSlideElement } = leftSlideElementRef;
    const { current: downSlideElement } = downSlideElementRef;
    if (leftSlideElement && downSlideElement) {
      const leftShrect = leftSlideElement.getBoundingClientRect();
      const downShrect = downSlideElement.getBoundingClientRect();
      if (leftShrect.left > downShrect.right) {
        // We are really before animation
        setOverlapBoxSx({
          position: "absolute",
          width: `calc(100% - ${leftShrect.left}px)`,
          height: leftShrect.height,
          left: leftShrect.left,
          top: leftShrect.top,
          margin: "0",
          padding: "0",
          zIndex: 10,
          background: theme.palette.background.default,
        });
      } else {
        // For some reason (e.g. hotrefresh during dev) we are rendering after animation end. Make sure overlap box stays hidden.
        setOverlapBoxSx(null);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Container role="heading" aria-label={label} aria-level={level}>
        <Typography
          sx={{
            display: "inline-block",
            position: "relative",
            opacity: 0,
            animation: `${getKeyframes("down")} 1s forwards`,
            animationDelay: "0.2s",
            transform: "translateY(-200%)",
          }}
          variant={variant}
          ref={downSlideElementRef}
        >
          {verticalAnimationText}
        </Typography>
        <Typography
          sx={{
            display: "inline-block",
            position: "relative",
            opacity: 0,
            animation: `${getKeyframes("left")} 1s forwards`,
            animationDelay: "1.2s",
            transform: "translateX(100%)",
          }}
          variant={variant}
          ref={leftSlideElementRef}
          onAnimationEnd={() => {
            setOverlapBoxSx(null); // This will remove the overlapping box
          }}
        >
          {horizontalAnimationText}
        </Typography>
      </Container>
      {overlapBoxSx ? <Box component={variant} sx={overlapBoxSx} /> : undefined}
    </>
  );
};

export default Header;
