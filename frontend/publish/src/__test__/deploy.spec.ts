import test from "ava";
import * as common from "@data-heaving/common";
import * as spec from "../deploy";

const testGetBlobsToDelete = test.macro(
  (
    t,
    existingBlobs: ReadonlyArray<string>,
    uploadedBlobs: ReadonlyArray<string>,
    expectedDeletedFiles: ReadonlyArray<string>,
  ) => {
    // Without explicit generic arguments, there will be type error about ReadonlyArray not extending Array
    t.deepEqual<ReadonlyArray<string>, ReadonlyArray<string>>(
      spec.getBlobsToDelete(existingBlobs, uploadedBlobs),
      expectedDeletedFiles,
    );
  },
);

test(
  "When no existing blobs, nothing to delete.",
  testGetBlobsToDelete,
  [],
  ["index.html"],
  [],
);

test(
  "When same existing blob, nothing to delete.",
  testGetBlobsToDelete,
  ["index.html"],
  ["index.html"],
  [],
);

test(
  "When extra existing blobs, the extra blob is marked for deletion",
  testGetBlobsToDelete,
  ["index.html", "scripts.js"],
  ["index.html"],
  ["scripts.js"],
);

const testPeriodicProgressReport = test.macro(
  async (t, throwException: boolean) => {
    const elapsedMSs: Array<number> = [];
    const invokeTestableMethod = () =>
      spec.doWithPeriodicProgressReport(
        async () => {
          await common.sleep(100);
          if (throwException) {
            throw new Error("Error");
          }
        },
        10,
        (elapsedMS) => elapsedMSs.push(elapsedMS),
      );
    await (throwException
      ? t.throwsAsync(invokeTestableMethod, {
          instanceOf: Error,
        })
      : invokeTestableMethod());
    t.true(elapsedMSs.length > 0);
    t.true(elapsedMSs[elapsedMSs.length - 1] < 100);
  },
);

test(
  "When no exception, the 'long-running operation' completes and progress events are spawned.",
  testPeriodicProgressReport,
  false,
);
test(
  "With exception, the 'long-running operation' completes and progress events are spawned.",
  testPeriodicProgressReport,
  true,
);
