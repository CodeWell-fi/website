import { render, screen } from "@testing-library/react";
import * as utils from "../test-utils";
import Header from "../Header";

test("Renders header correctly", () => {
  const verticalAnimationText = "Vertical";
  const horizontalAnimationText = "Horizontal";
  const label = "Label";
  render(
    <Header
      verticalAnimationText={verticalAnimationText}
      horizontalAnimationText={horizontalAnimationText}
      label={label}
    />,
  );

  utils.performTestForElement(verticalAnimationText, "h1");
  utils.performTestForElement(horizontalAnimationText, "h1");
  const roleElement = utils.performTestForElement(
    screen.getAllByRole("heading")[0],
    "div",
  );
  expect(roleElement.getAttribute("aria-label")).toBe(label);
});
