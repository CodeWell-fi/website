/* istanbul ignore file */
import { screen } from "@testing-library/react";

export const performTestForElement = (
  elementText: string | Element,
  elementTag: string,
) => {
  const element =
    typeof elementText === "string"
      ? screen.getByText(new RegExp(elementText, "i"))
      : elementText;
  expect(element).toBeInTheDocument();
  expect(element.tagName).toMatch(new RegExp(`^${elementTag}$`, "i"));
  return element;
};
