import * as fs from "fs/promises";
import * as path from "path";
import * as id from "@azure/identity";
import * as storage from "@azure/storage-blob";
import * as cdn from "@azure/arm-cdn";
import * as mime from "mime-types";
import * as common from "@data-heaving/common";
import * as events from "./events";

export interface Inputs {
  credentials: id.TokenCredential;
  websiteContainer: {
    containerURL: string;
    webpageDir: string;
  };
  cdnEndpoint: {
    subscriptionId: string;
    resourceGroupName: string;
    profileName: string;
    endpointName: string;
  };
}

const deploy = async (
  eventEmitter: events.WebsiteDeployEventEimtter,
  {
    credentials,
    websiteContainer: { containerURL, webpageDir },
    cdnEndpoint,
  }: Inputs,
) => {
  // List all the existing files
  const container = new storage.ContainerClient(containerURL, credentials);
  const blobNames: Array<string> = [];
  for await (const blob of container.listBlobsFlat({
    includeMetadata: false,
    includeDeleted: false,
    includeVersions: false,
  })) {
    blobNames.push(blob.name);
  }

  // Upload all new files
  const uploadOneFile = async (filePath: string) => {
    const blobPath = filePath.substr(webpageDir.length + 1);
    return {
      blobPath,
      uploadResult: await container
        .getBlockBlobClient(blobPath)
        .uploadFile(filePath, {
          blobHTTPHeaders: {
            blobContentType:
              mime.lookup(path.extname(filePath)) || "application/octet-stream",
          },
        }),
    };
  };
  const promises: Array<Promise<events.UploadResult>> = [];
  for await (const directoryFiles of getFilesRecursively(webpageDir)) {
    promises.push(...directoryFiles.map(uploadOneFile));
  }
  const blobs = await Promise.all(promises);
  eventEmitter.emit("uploadedFilesToWebsiteContainer", {
    containerURL,
    blobs,
  });

  const blobsToDelete = getBlobsToDelete(
    blobNames,
    blobs.map(({ blobPath }) => blobPath),
  );

  if (blobsToDelete.length > 0) {
    // Note that deleting blobs in batch *does not work* for website container!
    // Instead, one must use the plain "deleteBlob" to delete them one by one.
    await common.iterateInParallel(
      blobsToDelete,
      10,
      async (blobName) =>
        await container.deleteBlob(blobName, {
          deleteSnapshots: "include",
        }),
    );
  }
  eventEmitter.emit("deletedFilesFromWebsiteContainer", {
    containerURL,
    blobNames: blobsToDelete,
  });

  // Purge CDN caches
  const contentPaths = ["/*"];
  const cdnPurgeEvent = { contentPaths: [...contentPaths] };
  eventEmitter.emit("cdnPurgeStarting", cdnPurgeEvent);
  const purgeSuccess = await doWithPeriodicProgressReport(
    () =>
      new cdn.CdnManagementClient(
        credentials,
        cdnEndpoint.subscriptionId,
      ).endpoints.purgeContent(
        cdnEndpoint.resourceGroupName,
        cdnEndpoint.profileName,
        cdnEndpoint.endpointName,
        contentPaths,
      ),
    1000,
    (elapsedMS) => {
      const elapsedS = elapsedMS / 1000;
      if (elapsedS > 0) {
        eventEmitter.emit("cdnPurgeProgress", { ...cdnPurgeEvent, elapsedS });
      }
    },
  );
  eventEmitter.emit("cdnPurgeCompleted", { ...cdnPurgeEvent, purgeSuccess });
};

// Slightly modified from https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
// We are returning an array of strings in one batch instead of 1 file at a time
async function* getFilesRecursively(
  dir: string,
): AsyncGenerator<Array<string>> {
  const dirents = (await fs.readdir(dir, { withFileTypes: true })).map(
    (dirent) => ({ dirent, fullPath: path.resolve(dir, dirent.name) }),
  );
  yield dirents
    .filter(({ dirent }) => !dirent.isDirectory())
    .map(({ fullPath }) => fullPath);
  for (const { fullPath } of dirents.filter(({ dirent }) =>
    dirent.isDirectory(),
  )) {
    yield* getFilesRecursively(fullPath);
  }
}

export const getBlobsToDelete = (
  existingBlobs: ReadonlyArray<string>,
  uploadedBlobs: ReadonlyArray<string>,
) => {
  const newBlobsSet = new Set(uploadedBlobs);
  return existingBlobs.filter(
    (existingBlobName) => !newBlobsSet.has(existingBlobName),
  );
};

export const doWithPeriodicProgressReport = async (
  action: () => Promise<unknown>,
  progressTickMS: number,
  onProgress: (elapsedMS: number) => void,
) => {
  let actionCompletedSuccessfully = false;
  const now = new Date().valueOf();
  await Promise.race([
    (async () => {
      await action();
      actionCompletedSuccessfully = true;
    })(),
    (async () => {
      while (!actionCompletedSuccessfully) {
        onProgress(new Date().valueOf() - now);
        await common.sleep(progressTickMS);
      }
    })(),
  ]);
  return actionCompletedSuccessfully;
};

export default deploy;
