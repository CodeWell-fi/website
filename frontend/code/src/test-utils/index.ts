/* istanbul ignore file */
import { screen, Matcher } from "@testing-library/react";

export const performTestForElement = (
  elementText: Matcher | Element,
  elementTag: string,
) => {
  const element =
    elementText instanceof Element
      ? elementText
      : screen.getByText(
          typeof elementText === "string"
            ? new RegExp(elementText, "i")
            : elementText,
        );
  expect(element).toBeInTheDocument();
  expect(element.tagName).toMatch(new RegExp(`^${elementTag}$`, "i"));
  return element;
};
