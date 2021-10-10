import { render, screen } from "@testing-library/react";
import Footer from "../Footer";

test("renders footer", () => {
  render(<Footer label="Footer" githubLink="" />);
  const linkElement = screen.getByText(
    /This site was made with Azure, Pulumi, React, and lots of/i,
  );
  expect(linkElement).toBeInTheDocument();
});
