import * as common from "@data-heaving/common";
import * as storage from "@azure/storage-blob";
import type * as types from "./types";

// This is virtual interface - no instances implementing this are ever created
export interface VirtualWebsiteDeployEvents {
  skippedDeployment: {
    version: string;
    previousVersions: ReadonlyArray<string>;
  };
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
  beforeDeletingPreviousCDNEndpointDomain: {
    resourceGroupName: string;
    profileName: string;
    endpointName: string;
    endpointDomainName: string;
    hostname: string;
  };
  beforeCreatingNewCDNEndpointDomain: VirtualWebsiteDeployEvents["beforeDeletingPreviousCDNEndpointDomain"];
  beforeEnablingCustomHttps: VirtualWebsiteDeployEvents["beforeDeletingPreviousCDNEndpointDomain"];
  duringEnablingCustomHttps: VirtualWebsiteDeployEvents["beforeDeletingPreviousCDNEndpointDomain"] & {
    customHttpsProvisioningState: string | undefined;
    customHttpsProvisioningSubstate: string | undefined;
    elapsedM: number;
  };
  afterEnablingCustomHttps: VirtualWebsiteDeployEvents["beforeDeletingPreviousCDNEndpointDomain"] & {
    state: string;
    subState: string;
  };
  beforeCreatingGitTag: {
    tagName: string;
    deploymentIDInfo: types.DeploymentIDInfo;
  };
  afterCreatingGitTag: VirtualWebsiteDeployEvents["beforeCreatingGitTag"] & {
    tagCreation: {
      stdout: string;
      stderr: string;
    };
    tagPush: {
      stdout: string;
      stderr: string;
    };
  };
}

export interface UploadResult {
  blobPath: string;
  uploadResult: storage.BlobUploadCommonResponse;
}

export type WebsiteDeployEventEmitter =
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

  builder.addEventListener("skippedDeployment", (arg) =>
    logger(
      `Skipping deployment because version ${
        arg.version
      } is already previously deployed, or is not newest (newest is ${
        arg.previousVersions[0] ?? "none"
      }).`,
    ),
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
    const seconds = Math.trunc(arg.elapsedS);
    if (seconds > 0 && seconds % 10 === 0) {
      logger(`Waiting for Azure CDN endpoint purge... (~${seconds}s)`);
    }
  });
  builder.addEventListener("cdnPurgeCompleted", (arg) =>
    logger(
      `Completed Azure CDN endpoint purge ${
        arg.purgeSuccess ? "" : "un"
      }successfully.`,
    ),
  );

  const logCDNEndpointDomainInfo = (
    arg: VirtualWebsiteDeployEvents["beforeDeletingPreviousCDNEndpointDomain"],
    prefix: string,
  ) =>
    logger(
      `${prefix}, RG ${arg.resourceGroupName}, profile ${arg.profileName}, endpoint ${arg.endpointName}, domain ${arg.endpointDomainName}, hostname ${arg.hostname}.`,
    );
  builder.addEventListener("beforeDeletingPreviousCDNEndpointDomain", (arg) =>
    logCDNEndpointDomainInfo(
      arg,
      "Deleting previous publishing CDN endpoint domain",
    ),
  );

  builder.addEventListener("beforeCreatingNewCDNEndpointDomain", (arg) =>
    logCDNEndpointDomainInfo(
      arg,
      "Creating new publishing CDN endpoint domain",
    ),
  );

  builder.addEventListener("beforeEnablingCustomHttps", (arg) =>
    logCDNEndpointDomainInfo(arg, "Enabling HTTPS"),
  );

  builder.addEventListener("duringEnablingCustomHttps", (arg) => {
    const minutes = Math.trunc(arg.elapsedM);
    if (minutes > 0) {
      logCDNEndpointDomainInfo(
        arg,
        `Waiting for HTTPS (${minutes}m, ${arg.customHttpsProvisioningState}, ${arg.customHttpsProvisioningSubstate})`,
      );
    }
  });

  builder.addEventListener("afterEnablingCustomHttps", (arg) =>
    logCDNEndpointDomainInfo(
      arg,
      `HTTPS state info: ${arg.state}, ${arg.subState}`,
    ),
  );

  builder.addEventListener("beforeCreatingGitTag", (arg) =>
    logger(
      `Created relative record name "${arg.deploymentIDInfo.zone.relativeRecordName}" to zone "${arg.deploymentIDInfo.zone.name}".
Will create Git tag "${arg.tagName}" based on ID "${arg.deploymentIDInfo.encodedTagName.id}" and version "${arg.deploymentIDInfo.encodedTagName.version}".`,
    ),
  );

  builder.addEventListener("afterCreatingGitTag", (arg) => {
    logger(arg.tagCreation.stdout);
    if (arg.tagCreation.stderr.length > 0) {
      logger(arg.tagCreation.stderr, true);
    }
    logger(arg.tagPush.stdout);
    if (arg.tagPush.stderr.length > 0) {
      logger(arg.tagPush.stderr, true);
    }
  });

  return builder;
};
