import { Container, Box, Link, useTheme } from "@mui/material";

export interface FooterProps {
  label: string;
  githubLink: string;
}
const Footer = ({ label, githubLink }: FooterProps) => {
  const theme = useTheme();
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
      <Box
        aria-label={label}
        component="footer"
        sx={{
          position: "fixed",
          display: "flex",
          bottom: 0,
          left: 0,
          width: "100vw",
          justifyContent: "center",
          paddingBottom: "1rem",
          paddingTop: "1rem",
          backgroundColor: theme.palette.primary.dark, // theme.palette.background.default,
        }}
      >
        <Link
          href={githubLink}
          target="_blank"
          rel="noopener noreferrer"
          typography="subtitle2"
          color={theme.palette.primary.light}
        >
          This site was made with Azure, Pulumi, React, and lots of&nbsp;
          <span role="img" aria-label="tea">
            🍵
          </span>
        </Link>
      </Box>
    </Container>
  );
};

export default Footer;
