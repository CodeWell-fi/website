import { useRef, useState } from "react";
import { Button } from "@mui/material";
import { Email } from "@mui/icons-material";
import * as common from "./common";

export const Contact = () => {
  const mailAddress = useRef<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  return common.renderLines([
    "Feel free to reach out for me if you are interested in discussing your needs for developing solutions for your organization.",
    [
      (lineIdx, fragmentIdx, { sx }) => (
        <Button
          key={`${lineIdx}-${fragmentIdx}`}
          variant="contained"
          sx={sx}
          startIcon={<Email />}
          color={isError ? "error" : undefined}
          onClick={async () => {
            if (!mailAddress.current) {
              try {
                const mailAddressUrl = process.env.REACT_APP_CONTACT_MAIL_URL; // This is set by scripts/prepare-env.ts
                if (!mailAddressUrl) {
                  throw new Error(
                    `The mail address URL was not set by build process, this is internal error!`,
                  );
                }
                mailAddress.current = await (
                  await fetch(mailAddressUrl)
                ).text();
                setIsError(false);
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error(
                  "An error occurred during fetching the mail address.",
                  e,
                );
                setIsError(true);
              }
            }
            if (mailAddress.current) {
              // Don't use window.open, as that will cause occasional flickering
              location.href = `mailto:${
                mailAddress.current
              }?subject=${encodeURIComponent("Contact enquiry from website")}`;
            }
          }}
        >
          Contact by e-mail
        </Button>
      ),
    ],
  ]);
};
