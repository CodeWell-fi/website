import Header from "./Header";
import Footer from "./Footer";
import Main from "./Main";
import { What, Who, Contact } from "./content";

const App = () => {
  return (
    <>
      <Header
        label="Code Well"
        verticalAnimationText="Code."
        horizontalAnimationText="Well."
      />
      <Main
        tabGroupUniqueName="main"
        tabs={[
          {
            label: "What",
            component: What,
          },
          {
            label: "Who",
            component: Who,
          },
          {
            label: "Contact",
            component: Contact,
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
