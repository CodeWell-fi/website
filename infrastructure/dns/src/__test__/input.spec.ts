import test from "ava";
import * as common from "./common";

test("Verify that config files adher to schema in the code.", async (c) => {
  // This will throw if any errors are in config/config.json file.
  await common.readConfigFile();
  c.true(true, "");
});
