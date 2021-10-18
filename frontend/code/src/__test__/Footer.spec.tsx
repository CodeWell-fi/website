import { render, screen } from "@testing-library/react";
import Footer from "../Footer";
import * as packageJson from "../../package.json";

test("renders footer", () => {
  render(<Footer label="Footer" githubLink="" />);

  performTestForElement("Source code", "a");
  performTestForElement(packageJson.version, "abbr");
  performTestForElement("🍵", "span");
});

const performTestForElement = (elementText: string, elementTag: string) => {
  const teaElement = screen.getByText(new RegExp(elementText, "i"));
  expect(teaElement).toBeInTheDocument();
  expect(teaElement.tagName).toMatch(new RegExp(`^${elementTag}$`, "i"));
};
