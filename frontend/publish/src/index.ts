import * as process from "process";
import * as fs from "fs/promises";
import * as path from "path";
import * as cp from "child_process";
import { promisify } from "util";
import * as dns from "@azure/arm-dns";
import * as cdn from "@azure/arm-cdn";

import * as validation from "@data-heaving/common-validation";
import * as identity from "@azure/identity";
import * as types from "./types";
import * as config from "./config";
import * as naming from "./naming";
import * as events from "./events";
import * as ep from "./endpoint";
import deploy from "./deploy";

const execFileAsync = promisify(cp.execFile);

const doThrow = <T>(msg: string): T => {
  throw new Error(msg);
};

const pipelineConfigEnvName = "AZURE_PIPELINE_CONFIG";
const infraConfigEnvName = "WEBSITE_INFRA_CONFIG";

const main = async () => {
  // 0. Get configs
  const { auth, azure } = validation.decodeOrThrow(
    config.pipelineConfig.decode,
    JSON.parse(
      process.env[pipelineConfigEnvName] ??
        doThrow(
          `Please provide pipeline config via "${pipelineConfigEnvName}" environment variable.`,
        ),
    ),
    () => {
      // Throw custom error to avoid potentially leaking secret contents as error messages
      throw new Error("The supplied Azure pipeline configuration was invalid");
    },
  );
  const infraConfig = validation.decodeOrThrow(
    config.infraConfig.decode,
    JSON.parse(
      process.env[infraConfigEnvName] ??
        doThrow(
          `Please provide infra config via "${infraConfigEnvName}" environment variable.`,
        ),
    ),
  );
  const {
    organization,
    environment,
    resourceGroupName,
    relativeCodeDirectory,
    idInfo,
  } = infraConfig;
  // 1. Create credentials
  let credentials: identity.TokenCredential;
  switch (auth.type) {
    case "sp":
      {
        credentials = new identity.ClientCertificateCredential(
          azure.tenantId,
          auth.clientId,
          {
            certificate: `${auth.keyPEM}${auth.certPEM}`,
            certificatePath: undefined,
          },
        );
      }
      break;
    case "msi":
      credentials = new identity.ManagedIdentityCredential(auth.clientId);
      break;
  }
  const websiteCodeDir = path.normalize(
    `${process.cwd()}/${relativeCodeDirectory}`,
  );
  const id = await pickSuitableID(idInfo, websiteCodeDir);
  const eventEmitter = events
    .consoleLoggingRunEventEmitterBuilder()
    .createEventEmitter();
  if (typeof id === "string" || "encodedTagName" in id) {
    const idString = typeof id === "string" ? id : id.encodedTagName.id;
    const cdnClient = await deploy(eventEmitter, {
      credentials,
      websiteContainer: {
        containerURL: `https://${naming.getStorageAccountName(
          organization,
          environment,
          idString,
        )}.blob.core.windows.net/$web`,
        webpageDir: `${websiteCodeDir}/build`,
      },
      cdnEndpoint: {
        subscriptionId: azure.subscriptionId,
        resourceGroupName,
        profileName: naming.getCDNProfileName(organization, environment),
        endpointName: naming.getCDNProfileEndpointName(
          organization,
          environment,
          idString,
        ),
      },
    });
    if (typeof id !== "string") {
      await afterDeployment(
        credentials,
        infraConfig,
        azure.subscriptionId,
        eventEmitter,
        id,
        cdnClient,
      );
    }
  } else {
    eventEmitter.emit("skippedDeployment", id);
  }
};

const pickSuitableID = async (
  idInfo: config.IDInfo,
  websiteCodeDir: string,
) => {
  const idArray =
    typeof idInfo === "string"
      ? [idInfo]
      : "id" in idInfo
      ? [idInfo.id]
      : idInfo.ids;
  let nextID:
    | string
    | types.DeploymentIDInfo
    | { version: string; previousVersions: Array<string> };
  if (typeof idInfo !== "string") {
    const tagInfo = idInfo.tagInfo;
    if (idArray.length < 1) {
      throw new Error("Please supply at least one deployment kind ID.");
    }
    const version = validation.decodeOrThrow(
      config.packageJsonWithVersion.decode,
      JSON.parse(await fs.readFile(`${websiteCodeDir}/package.json`, "utf8")),
    ).version;
    const { id, previousVersions } = ep.pickSuitableEndpointID(
      tagInfo,
      idArray,
      ep.parseGitTags(
        (
          await execFileAsync("git", [
            "ls-remote",
            "--tags",
            "--refs",
            "origin",
          ])
        ).stdout,
      ),
      version,
    );
    if (id) {
      if ("zone" in idInfo) {
        nextID = {
          encodedTagName: {
            version,
            id,
            tagInfo,
          },
          zone: {
            ...idInfo.zone,
            relativeRecordName: idInfo.zone.relativeRecordName ?? "@",
          },
        };
      } else {
        throw new Error(
          "This should never happen (pickSuitableEndpointID returned ID but zone was not specified)",
        );
      }
    } else {
      nextID = {
        version,
        previousVersions,
      };
    }
  } else {
    nextID = idArray[0];
  }

  return nextID;
};

const afterDeployment = async (
  credentials: identity.TokenCredential,
  {
    organization,
    environment,
    resourceGroupName,
  }: Pick<
    config.InfraConfig,
    "organization" | "environment" | "resourceGroupName"
  >,
  subscriptionId: string,
  eventEmitter: events.WebsiteDeployEventEmitter,
  deploymentIDInfo: types.DeploymentIDInfo,
  cdnClient: cdn.CdnManagementClient,
) => {
  const { encodedTagName, zone } = deploymentIDInfo;
  // Create or update root record to point from top-level domain to current deployed domain
  await new dns.DnsManagementClient(
    credentials,
    subscriptionId,
  ).recordSets.createOrUpdate(
    zone.resourceGroupName,
    zone.name,
    zone.relativeRecordName,
    "CNAME",
    {
      cnameRecord: {
        cname: (
          await cdnClient.customDomains.listByEndpoint(
            resourceGroupName,
            naming.getCDNProfileName(organization, environment),
            naming.getCDNProfileEndpointName(
              organization,
              environment,
              encodedTagName.id,
            ),
          )
        )[0].hostName,
      },
    },
  );
  // Create git tag
  const tagName = ep.getTagNameFromEncoded(encodedTagName);
  eventEmitter.emit("beforeCreatingGitTag", {
    tagName,
    deploymentIDInfo,
  });
  const tagCreation = await execFileAsync("git", [
    "-c",
    "user.email=cd-automation@codewell-site.project",
    "-c",
    "user.name=CD Automation",
    "tag",
    "-a",
    "-m",
    `Website ${encodedTagName.id} release ${encodedTagName.version}.`,
    tagName,
  ]);
  const tagPush = await execFileAsync("git", ["push", "origin", tagName]);
  eventEmitter.emit("afterCreatingGitTag", {
    tagName,
    deploymentIDInfo,
    tagCreation,
    tagPush,
  });
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
