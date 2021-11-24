import * as common from "@data-heaving/common";
import * as storage from "@azure/storage-blob";

// This is virtual interface - no instances implementing this are ever created
export interface VirtualWebsiteDeployEvents {
  deletedFilesFromWebsiteContainer: {
    containerURL: string;
    blobNames: ReadonlyArray<string>;
  };
  uploadedFilesToWebsiteContainer: {
    containerURL: string;
    blobs: ReadonlyArray<UploadResult>;
  };
  cdnPurgeStarting: {
    contentPaths: ReadonlyArray<string>;
  };
  cdnPurgeProgress: VirtualWebsiteDeployEvents["cdnPurgeStarting"] & {
    elapsedS: number;
  };
  cdnPurgeCompleted: VirtualWebsiteDeployEvents["cdnPurgeStarting"] & {
    purgeSuccess: boolean;
  };
}

export interface UploadResult {
  blobPath: string;
  uploadResult: storage.BlobUploadCommonResponse;
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
  builder.addEventListener("cdnPurgeProgress", (arg) => {
    if (arg.elapsedS % 10 === 0) {
      logger(`Waiting for Azure CDN endpoint purge... (~${arg.elapsedS}s)`);
    }
  });
  builder.addEventListener("cdnPurgeCompleted", (arg) =>
    logger(
      `Completed Azure CDN endpoint purge ${
        arg.purgeSuccess ? "" : "un"
      }successfully.`,
    ),
  );

  return builder;
};
