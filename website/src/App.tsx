import logo from "./logo.svg";
import "./App.css";

const App = () => (
  <div className="App">
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />
      <p>Under construction.</p>
      <a
        className="App-link"
        href="https://github.com/CodeWell-fi/website"
        target="_blank"
        rel="noopener noreferrer"
      >
        This site was made with Azure, Pulumi, React, and lots of tea
        <span role="img" aria-label="tea">
          🍵
        </span>
      </a>
    </header>
  </div>
);

export default App;
