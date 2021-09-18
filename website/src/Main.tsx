import { ReactNode, ReactElement } from "react";
import { Box, Container } from "@mui/material";
import { NavBar } from "./ScrollTabs";

interface MainProps {
  tabGroupUniqueName: string;
  tabs: ReadonlyArray<{
    label: ReactNode;
    component: () => ReactElement; // ElementType
  }>;
}

// function a11yProps(index) {
//   return {
//     id: `simple-tab-${index}`,
//     "aria-controls": `simple-tabpanel-${index}`,
//   };
// }

const Main = ({ tabGroupUniqueName, tabs }: MainProps) => {
  const getID = (idx: number) => `tab-${tabGroupUniqueName}-${idx}`;
  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          backgroundColor: "#fff",
        }}
        component="nav"
      >
        <NavBar
          items={tabs.map(({ label }, idx) => ({
            hash: getID(idx),
            label,
          }))}
        />
      </Box>
      <Container>
        {tabs.map(({ component }, idx) => (
          <Box
            key={idx}
            id={getID(idx)}
            sx={{
              minHeight: "100vh",
            }}
            component="article"
          >
            {component()}
          </Box>
        ))}
      </Container>
    </Box>
  );
};

export default Main;
