// This file will generate .env file so that the site code can access some meta-information via process.env.
import * as fs from "fs/promises";
import * as process from "process";
import { execFile } from "child_process";
import { promisify } from "util";
import * as packageJson from "../package.json";

const execFileAsync = promisify(execFile);

const main = async () => {
  await fs.writeFile(
    `${process.cwd()}/.env`,
    Object.entries(await buildEnv())
      .map(([envName, envValue]) => `${envName}='${envValue}'`)
      .join("\n"),
    "utf8",
  );
};

const buildEnv = async (): Promise<Record<string, string>> => {
  // Env names must start with REACT_APP_ in order for CRA to pick them up.
  return {
    REACT_APP_VERSION_STRING: packageJson.version,
    REACT_APP_GIT_SHA: (
      await execFileAsync("git", ["rev-parse", "HEAD"])
    ).stdout.trim(),
  };
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
