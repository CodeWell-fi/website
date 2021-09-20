import { useRef, useState } from "react";
import { Box, Container, Typography, useTheme } from "@mui/material";
import { SxProps } from "@mui/system";
import { keyframes } from "@emotion/react";

const getKeyframes2 = (direction: "down" | "left") => keyframes`
0% {
  opacity: 1;
}

70% {
  transform: translate${direction === "down" ? "Y" : "X"}(${
  direction === "down" ? "" : "-"
}5%);
}

100% {
  transform: translate${direction === "down" ? "Y" : "X"}(0);
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
  const level = 2;
  const variant = `h${level}` as const;
  const theme = useTheme();
  const leftSlideElementRef = useRef<HTMLElement>(null);
  const [overlapBoxSx, setOverlapBoxSx] = useState<SxProps<
    typeof theme
  > | null>(null);

  return (
    <>
      <Container
        role="heading"
        aria-label={label}
        aria-level={level}
        sx={{
          // display: "flex"
          overflow: "hidden",
        }}
      >
        <Typography
          sx={{
            display: "inline-block",
            position: "relative",
            opacity: 0,
            // animation: `${getKeyframes("bottom", "+1em")} 1s forwards`,
            animation: `${getKeyframes2("down")} 1s forwards`,
            animationDelay: "0.5s",
            transform: "translateY(-200%)",
          }}
          variant={variant}
        >
          {verticalAnimationText}
        </Typography>
        <Typography
          sx={{
            display: "inline-block",
            position: "relative",
            opacity: 0,
            // animation: `${getKeyframes("left", "+2em")} 1s forwards`,
            animation: `${getKeyframes2("left")} 1s forwards`,
            animationDelay: "1.5s",
            transform: "translateX(100%)",
          }}
          variant={variant}
          ref={leftSlideElementRef}
          onAnimationStart={() => {
            const { current: leftSlideElement } = leftSlideElementRef;
            if (leftSlideElement) {
              const shrect = leftSlideElement.getBoundingClientRect();
              // eslint-disable-next-line
              setOverlapBoxSx({
                position: "absolute",
                width: "100%",
                height: shrect.height,
                left: shrect.left,
                top: shrect.top,
                boxSizing: "border-box",
                margin: "0",
                padding: "0",
                zIndex: 10,
                background: theme.palette.background.default,
              });
            }
          }}
          onAnimationEnd={() => {
            setOverlapBoxSx(null); // This will remove the overlapping box
          }}
        >
          {horizontalAnimationText}
        </Typography>
      </Container>
      {
        // This box is only to avoid the horizontal animation text just suddenly appearing and starting moving. By having high z-index element filling the remainder of horizontal space and with solid bg color, it will look like the text is sliding from under the element.
        overlapBoxSx ? <Box component={variant} sx={overlapBoxSx} /> : undefined
      }
    </>
  );
};

export default Header;
