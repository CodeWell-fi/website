import { Box } from "@mui/material";
import { keyframes } from "@emotion/react";

const getKeyframes = (
  position: "bottom" | "left" | "top" | "right",
  startPosition: string,
) => keyframes`
0% {
  ${position}: ${startPosition};
  opacity: 1;
}

70% {
  ${position}: -0.1em;
}

100% {
  ${position}: 0;
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
  return (
    <Box
      role="heading"
      aria-label={label}
      aria-level={1}
      sx={{ typography: "h1", display: "flex" }}
    >
      <Box
        sx={{
          display: "inline",
          position: "relative",
          animation: `${getKeyframes("bottom", "+1em")} 1s forwards`,
        }}
      >
        {verticalAnimationText}
      </Box>
      <Box
        sx={{
          display: "inline",
          position: "relative",
          opacity: 0,
          animation: `${getKeyframes("left", "+2em")} 1s forwards`,
          animationDelay: "0.5s",
        }}
      >
        {horizontalAnimationText}
      </Box>
      <Box
        sx={{
          // This box is only to avoid the horizontal animation text just suddenly appearing and starting moving. By having high z-index element filling the remainder of horizontal space and with solid bg color, it will look like the text is sliding from under the element.
          display: "inline",
          position: "relative",
          zIndex: 10,
          background: "white", // TODO parametrize from theme variables
          flexGrow: 1,
        }}
      />
    </Box>
  );
};

export default Header;
