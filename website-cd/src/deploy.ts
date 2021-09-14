import * as fs from "fs/promises";
import * as path from "path";
import * as id from "@azure/identity";
import * as storage from "@azure/storage-blob";
import * as cdn from "@azure/arm-cdn";
import * as mime from "mime-types";
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
  // Delete all the existing files
  const container = new storage.ContainerClient(containerURL, credentials);
  const blobNames: Array<string> = [];
  for await (const blob of container.listBlobsFlat({
    includeMetadata: false,
    includeDeleted: false,
    includeVersions: false,
  })) {
    blobNames.push(blob.name);
  }
  if (blobNames.length > 0) {
    await container.getBlobBatchClient().deleteBlobs(
      blobNames.map((blobName) => `${container.url}/${blobName}`),
      credentials,
    );
  }
  eventEmitter.emit("deletedFilesFromWebsiteContainer", {
    containerURL,
    blobNames,
  });

  // Upload all new files
  const promises: Array<Promise<storage.BlobUploadCommonResponse>> = [];
  for await (const directoryFiles of getFilesRecursively(webpageDir)) {
    promises.push(
      ...directoryFiles.map((filePath) => {
        return container
          .getBlockBlobClient(filePath.substr(webpageDir.length + 1))
          .uploadFile(filePath, {
            blobHTTPHeaders: {
              blobContentType:
                mime.lookup(path.extname(filePath)) ||
                "application/octet-stream",
            },
          });
      }),
    );
  }
  eventEmitter.emit("uploadedFilesToWebsiteContainer", {
    containerURL,
    blobs: await Promise.all(promises),
  });

  // Purge CDN caches
  const contentPaths = ["/*"];
  eventEmitter.emit("cdnPurgeStarting", { contentPaths: [...contentPaths] });
  await new cdn.CdnManagementClient(
    credentials,
    cdnEndpoint.subscriptionId,
  ).endpoints.purgeContent(
    cdnEndpoint.resourceGroupName,
    cdnEndpoint.profileName,
    cdnEndpoint.endpointName,
    contentPaths,
    {
      onDownloadProgress: (progress) =>
        eventEmitter.emit("cdnPurgeProgress", {
          kind: "download",
          progress,
          contentPaths: [...contentPaths],
        }),
      onUploadProgress: (progress) =>
        eventEmitter.emit("cdnPurgeProgress", {
          kind: "upload",
          progress,
          contentPaths: [...contentPaths],
        }),
    },
  );
  eventEmitter.emit("cdnPurgeCompleted", { contentPaths: [...contentPaths] });
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

export default deploy;
