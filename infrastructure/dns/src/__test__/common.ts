import * as validation from "@data-heaving/common-validation";
import * as fs from "fs/promises";
import * as input from "../input";

export const readConfigFile = async () =>
  validation.decodeOrThrow(
    input.configuration.decode,
    JSON.parse(await fs.readFile(`./config/config.json`, "utf8")),
  );
