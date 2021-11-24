import { render } from "@testing-library/react";
import * as utils from "../test-utils";
import Footer from "../Footer";
import * as packageJson from "../../package.json";

test("Renders footer correctly", () => {
  render(<Footer label="Footer" githubLink="" />);

  utils.performTestForElement("Source code", "a");
  utils.performTestForElement(packageJson.version, "abbr");
  utils.performTestForElement("🍵", "span");
});
