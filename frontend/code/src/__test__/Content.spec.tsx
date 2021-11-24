import { render } from "@testing-library/react";
import * as utils from "../test-utils";
import Content, { ContentProps } from "../Content";

test("Renders content correctly without sections", () => {
  performContentTest([]);
});

test("Renders content correctly with 1 section", () => {
  performContentTest([
    {
      label: "Label",
      content: "Content",
    },
  ]);
});

test("Renders content correctly with 2 sections", () => {
  performContentTest([
    {
      label: "Label1",
      content: "Content1",
    },
    {
      label: "Label2",
      content: "Content2",
    },
  ]);
});

const performContentTest = (
  sectionTexts: ReadonlyArray<{ label: string; content: string }>,
) => {
  const sections: ContentProps["sections"] = sectionTexts.map(
    ({ label, content }) => ({
      label: <span>{label}</span>,
      component: <p>{content}</p>,
    }),
  );
  // These tests may not look like human-readable -approach to testing, but actually things like order of elements does have effect on how the site looks like.
  // Especially since content is positioned as 'absolute'.
  const headerString = "Header";
  const renderResult = render(
    <Content
      header={<span>{headerString}</span>}
      tabGroupUniqueName="main"
      sections={sections}
    />,
  );
  const renderedHeader = utils.performTestForElement(headerString, "span");
  sectionTexts.forEach(({ label, content }) => {
    // Check that label is rendered
    utils.performTestForElement(label, "span");
    // Check that content is rendered
    utils.performTestForElement(content, "p");
  });
  const contentContainer = renderResult.container;
  expect(contentContainer.childElementCount).toBe(1);
  // This is outermost <Box>
  const contentBase = contentContainer.children[0];
  expect(contentBase.childElementCount).toBe(3);
  const [content, header, nav] = contentBase.children;
  // 1st child must be Box with Container having contents
  expect(content.childElementCount).toBe(1);
  expect(content.children[0].childElementCount).toBe(sections.length);
  for (const child of content.children[0].children) {
    utils.performTestForElement(child, "article");
  }
  // 2nd child is the header
  expect(header === renderedHeader).toBe(true);
  // 3rd child is the nav bar container with tabs
  utils.performTestForElement(nav, "nav");
  expect(nav.childElementCount).toBe(1);
  expect(nav.children[0].childElementCount).toBe(1);
  expect(nav.children[0].children[0].childElementCount).toBe(2); // Indicator + container for titles
  expect(nav.children[0].children[0].children[0].childElementCount).toBe(
    sections.length,
  );
  expect(nav.children[0].children[0].children[1].childElementCount).toBe(0);
  for (const [idx, child] of Array.from(
    nav.children[0].children[0].children[0].children,
  ).entries()) {
    utils.performTestForElement(child, "button");
    expect(child.textContent).toBe(sectionTexts[idx].label);
  }
};
