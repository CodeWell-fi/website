import * as common from "@data-heaving/common";
import * as storage from "@azure/storage-blob";
import * as msRest from "@azure/ms-rest-js";

// This is virtual interface - no instances implementing this are ever created
export interface VirtualWebsiteDeployEvents {
  deletedFilesFromWebsiteContainer: {
    containerURL: string;
    blobNames: ReadonlyArray<string>;
  };
  uploadedFilesToWebsiteContainer: {
    containerURL: string;
    blobs: ReadonlyArray<storage.BlobUploadCommonResponse>;
  };
  cdnPurgeStarting: {
    contentPaths: ReadonlyArray<string>;
  };
  cdnPurgeProgress: VirtualWebsiteDeployEvents["cdnPurgeStarting"] & {
    kind: "upload" | "download";
    progress: msRest.TransferProgressEvent;
  };
  cdnPurgeCompleted: VirtualWebsiteDeployEvents["cdnPurgeStarting"];
}

export type WebsiteDeployEventEimtter =
  common.EventEmitter<VirtualWebsiteDeployEvents>;

export const createRunEventEmitterBuilder = () =>
  new common.EventEmitterBuilder<VirtualWebsiteDeployEvents>();

export const consoleLoggingRunEventEmitterBuilder = (
  logMessagePrefix?: Parameters<typeof common.createConsoleLogger>[0],
  builder?: common.EventEmitterBuilder<VirtualWebsiteDeployEvents>,
  consoleAbstraction?: common.ConsoleAbstraction,
) => {
  if (!builder) {
    builder = createRunEventEmitterBuilder();
  }

  const logger = common.createConsoleLogger(
    logMessagePrefix,
    consoleAbstraction,
  );

  builder.addEventListener("deletedFilesFromWebsiteContainer", (arg) =>
    logger(
      `Deleted ${arg.blobNames.length} files from container "${arg.containerURL}".`,
    ),
  );
  builder.addEventListener("uploadedFilesToWebsiteContainer", (arg) =>
    logger(
      `Uploaded ${arg.blobs.length} files to container "${arg.containerURL}".`,
    ),
  );
  builder.addEventListener("cdnPurgeStarting", () =>
    logger("Starting Azure CDN endpoint purge"),
  );
  builder.addEventListener("cdnPurgeProgress", (arg) =>
    logger(
      `Azure CDN endpoint purge progress: ${arg.kind}, ${arg.progress.loadedBytes}`,
    ),
  );
  builder.addEventListener("cdnPurgeCompleted", () =>
    logger("Completed Azure CDN endpoint purge"),
  );

  return builder;
};
