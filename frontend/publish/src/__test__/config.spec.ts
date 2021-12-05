import test from "ava";
import * as validation from "@data-heaving/common-validation";
import * as fs from "fs/promises";
import * as process from "process";
import * as spec from "../config";

const testConfigParsingWorks = test.macro(async (c, envName: string) => {
  await c.notThrowsAsync(async () =>
    validation.decodeOrThrow(
      spec.infraConfig.decode,
      JSON.parse(
        await fs.readFile(
          `${process.cwd()}/config/config-${envName}.json`,
          "utf8",
        ),
      ),
    ),
  );
});

test("Test that dev configuration is parseable", testConfigParsingWorks, "dev");
test(
  "Test that prod configuration is parseable",
  testConfigParsingWorks,
  "prod",
);
