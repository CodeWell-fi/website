import * as r from "react";
import * as d from "react-dom";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import {
  CssBaseline,
  // ThemeProvider,
  // createTheme,
  // GlobalStyles,
} from "@mui/material";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// const theme = createTheme({
//   components: {
//     MuiCssBaseline: {
//       styleOverrides: `
//       body {
//         min-height: 100vh;
//       }
//       `,
//     },
//   },
// });

// Instead of rendering to body, we can customize its CSS
// More info on why not render directly to body: https://github.com/facebook/create-react-app/issues/1568#issuecomment-280139884
d.render(
  <r.StrictMode>
    <CssBaseline />
    {/* <GlobalStyles
      styles={{
        body: {

        },
      }}
    /> */}
    <App />
  </r.StrictMode>,
  document.getElementById("root"),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
void reportWebVitals();
