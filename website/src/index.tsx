import * as r from "react";
import * as d from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

d.render(
  <r.StrictMode>
    <App />
  </r.StrictMode>,
  document.getElementById("root"),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
void reportWebVitals();
