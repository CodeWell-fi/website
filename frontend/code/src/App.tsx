import Content from "./Content";
import Header from "./Header";
import Footer from "./Footer";
import { What, Who, Contact } from "./sections";

const App = () => {
  return (
    <>
      <Content
        header={
          <Header
            label="Code Well"
            verticalAnimationText="Code."
            horizontalAnimationText="Well."
          />
        }
        tabGroupUniqueName="main"
        sections={[
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
    </>
  );
};

export default App;
