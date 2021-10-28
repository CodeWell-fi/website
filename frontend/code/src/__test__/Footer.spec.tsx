import { render } from "@testing-library/react";
import * as common from "./common";
import Footer from "../Footer";
import * as packageJson from "../../package.json";

test("Renders footer correctly", () => {
  render(<Footer label="Footer" githubLink="" />);

  common.performTestForElement("Source code", "a");
  common.performTestForElement(packageJson.version, "abbr");
  common.performTestForElement("🍵", "span");
});
