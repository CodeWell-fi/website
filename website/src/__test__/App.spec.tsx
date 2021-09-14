import { render, screen } from "@testing-library/react";
import App from "../App";

test("renders footer", () => {
  render(<App />);
  const linkElement = screen.getByText(
    /This site was made with Azure, Pulumi, React, and lots of/i,
  );
  expect(linkElement).toBeInTheDocument();
});
