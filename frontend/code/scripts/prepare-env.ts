// This file will generate .env file so that the site code can access some meta-information via process.env.
import * as fs from "fs/promises";
import * as process from "process";
import { execFile } from "child_process";
import { promisify } from "util";
import * as packageJson from "../package.json";

const execFileAsync = promisify(execFile);

const main = async () => {
  const contactMailUrl = "/contact_mail.txt";
  const contactEmailAddressEnvName = "CONTACT_EMAIL_ADDRESS";
  await Promise.all([
    fs.writeFile(
      `${process.cwd()}/.env`,
      Object.entries(await buildEnv(contactMailUrl))
        .map(([envName, envValue]) => `${envName}='${envValue}'`)
        .join("\n"),
      "utf8",
    ),
    fs.writeFile(
      `${process.cwd()}/public${contactMailUrl}`,
      process.env[contactEmailAddressEnvName] ??
        doThrow(
          `Please provide contact email value via "${contactEmailAddressEnvName}" env variable.`,
        ),
      "utf8",
    ),
  ]);
};

const buildEnv = async (
  contactMailUrl: string,
): Promise<Record<string, string>> => {
  // Env names must start with REACT_APP_ in order for CRA to pick them up.
  return {
    REACT_APP_VERSION_STRING: packageJson.version,
    REACT_APP_GIT_SHA: (
      await execFileAsync("git", ["rev-parse", "HEAD"])
    ).stdout.trim(),
    REACT_APP_CONTACT_MAIL_URL: contactMailUrl,
  };
};

const doThrow = <T>(message: string): T => {
  throw new Error(message);
};

void (async () => {
  try {
    await main();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("ERROR", e);
    process.exit(1);
  }
})();
