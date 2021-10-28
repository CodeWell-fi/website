import { render, screen } from "@testing-library/react";
import * as common from "./common";
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

  common.performTestForElement(verticalAnimationText, "h1");
  common.performTestForElement(horizontalAnimationText, "h1");
  const roleElement = common.performTestForElement(
    screen.getAllByRole("heading")[0],
    "div",
  );
  expect(roleElement.getAttribute("aria-label")).toBe(label);
});
