import * as common from "./common";
import { Typography } from "@mui/material";

export const What = () =>
  common.renderLines([
    "CodeWell Ltd offers talented software development, tailored for your needs.",
    [
      "Areas of expertise include but are not limited to: Cloud (Azure, AWS, etc), DevOps (including ",
      (lineIdx, fragmentIndex, opts) => (
        <Typography
          key={`${lineIdx}-${fragmentIndex}`}
          {...opts}
          component="abbr"
          title="Infrastructure as a Code"
        >
          IaC
        </Typography>
      ),
      "), Big Data, Fullstack development, etc.",
    ],
    "Robustness, quality, and maintainability are aspects greatly emphasized and are strived hard to be achieved in all of the areas.",
  ]);
