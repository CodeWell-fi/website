import { Container, Box, Link, useTheme, Typography } from "@mui/material";
import { SxProps } from "@mui/system";

export interface FooterProps {
  label: string;
  githubLink: string;
}
const Footer = ({ label, githubLink }: FooterProps) => {
  const theme = useTheme();
  const displayOnSameRow: SxProps<typeof theme> = {
    display: "inline-block",
    position: "relative",
  };
  const shaString = `SHA: ${
    process.env.REACT_APP_GIT_SHA ?? "Not managed by GIT"
  }`;
  // Show title only when viewing on browsers which have hover ability on their primary device
  const abbrTitle = matchMedia("(hover: hover)").matches
    ? shaString
    : undefined;
  let abbrContents = process.env.REACT_APP_VERSION_STRING ?? "0.0.0";
  if (!abbrTitle) {
    abbrContents = `${abbrContents} (${shaString})`;
  }
  return (
    <Container
      sx={{
        position: "relative",
        display: "flex",
        width: "100vw",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container
        aria-label={label}
        component="footer"
        sx={{
          position: "fixed",
          display: "flex",
          bottom: 0,
          width: "100vw",
          justifyContent: "center",
          paddingBottom: "1rem",
          paddingTop: "1rem",
          backgroundColor: theme.palette.primary.dark, // theme.palette.background.default,
        }}
      >
        <Box typography="subtitle2">
          <Link
            href={githubLink}
            target="_blank"
            rel="noopener noreferrer"
            color={theme.palette.primary.light}
            sx={displayOnSameRow}
          >
            Source code
          </Link>
          <Typography sx={displayOnSameRow}>&nbsp;for version&nbsp;</Typography>
          <Typography component="abbr" title={abbrTitle} sx={displayOnSameRow}>
            {abbrContents}
          </Typography>
          <Typography sx={displayOnSameRow}>
            : made with Azure, Pulumi, React, and lots of&nbsp;
          </Typography>
          <Typography // eslint-disable-line jsx-a11y/accessible-emoji
            component="span"
            sx={displayOnSameRow}
            role="img"
            aria-label="tea"
          >
            🍵
          </Typography>
        </Box>
      </Container>
    </Container>
  );
};

export default Footer;
