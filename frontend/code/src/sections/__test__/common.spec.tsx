import { render, screen } from "@testing-library/react";
import * as utils from "../../test-utils";
import * as spec from "../common";

test("Renders one word correctly", () => {
  performOneLineTest(["Hello"]);
});

test("Renders multiple words correctly", () => {
  performOneLineTest(["Hello", "world!", "This", "is", "a", "test."]);
});

const performOneLineTest = (words: ReadonlyArray<string>) => {
  const text = words.join(" ");
  render(spec.renderLines([text]));
  const lineElement = screen.getByText(
    (content, element) => element instanceof HTMLParagraphElement,
  );
  expect(lineElement).toBeInTheDocument();
  expect(
    Array.from(lineElement.children).filter(
      (child) => !!child.textContent?.match(/^\s$/),
    ).length,
  ).toBe(words.length - 1);
  words.forEach((word) => utils.performTestForElement(`^${word}$`, "span"));
};
