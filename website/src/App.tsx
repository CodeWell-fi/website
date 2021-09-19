import { Container } from "@mui/material";
import Header from "./Header";
import Footer from "./Footer";
import Content from "./Content";
import { What, Who, Contact } from "./sections";

const App = () => {
  return (
    <Container>
      <Header
        label="Code Well"
        verticalAnimationText="Code."
        horizontalAnimationText="Well."
      />
      <Content
        tabGroupUniqueName="main"
        tabs={[
          {
            label: "What",
            component: <What />,
          },
          {
            label: "Who",
            component: <Who />,
          },
          {
            label: "Contact",
            component: <Contact />,
          },
        ]}
      />
      <Footer
        label="Source Code"
        githubLink="https://github.com/CodeWell-fi/website"
      />
    </Container>
  );
};

export default App;
