import * as process from "process";
import * as fs from "fs/promises";
import * as path from "path";
import * as cp from "child_process";
import { promisify } from "util";
import * as dns from "@azure/arm-dns";
import * as cdn from "@azure/arm-cdn";

import * as common from "@data-heaving/common";
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
  // Get the correct endpoint
  const profileName = naming.getCDNProfileName(organization, environment);
  const endpoints = await cdnClient.endpoints.listByProfile(
    resourceGroupName,
    profileName,
  );
  const fullDNSName = `${
    zone.relativeRecordName === "@" ? "" : `${zone.relativeRecordName}.`
  }${zone.name}`;

  // Delete custom domain from previous endpoint, if exists
  // Iterate all EPs of CDN profile
  const previousDomain = (
    await Promise.all(
      endpoints.map(async ({ name }) => ({
        name,
        domains: await cdnClient.customDomains.listByEndpoint(
          resourceGroupName,
          profileName,
          name ??
            doThrow(
              "This should never happen (CDN endpoint name was undefined).",
            ),
        ),
      })),
    )
  )
    .flatMap(({ name, domains }) => domains.map((domain) => ({ name, domain })))
    .find(({ domain: { hostName } }) => hostName === fullDNSName);
  const dnsClient = new dns.DnsManagementClient(credentials, subscriptionId);
  // Update the records to point to endpoint
  const endpointName = naming.getCDNProfileEndpointName(
    organization,
    environment,
    encodedTagName.id,
  );
  if (previousDomain && previousDomain.name !== endpointName) {
    const endpointName =
      previousDomain.name ??
      doThrow<string>(
        "This should never happen (CDN endpoint name was undefined #2).",
      );
    const endpointDomainName =
      previousDomain.domain.name ??
      doThrow<string>(
        "This should never happen (CDN endpoint domain name was undefined).",
      );
    eventEmitter.emit("beforeDeletingPreviousCDNEndpointDomain", {
      resourceGroupName,
      profileName,
      endpointName,
      endpointDomainName,
      hostname: previousDomain.domain.hostName,
    });
    // We must first remove DNS record before deleting CDN domain
    await dnsClient.recordSets.deleteMethod(
      zone.resourceGroupName,
      zone.name,
      zone.relativeRecordName,
      "CNAME",
    );
    await cdnClient.customDomains.deleteMethod(
      resourceGroupName,
      profileName,
      endpointName,
      endpointDomainName,
    );
  }

  const endpoint =
    endpoints.find(({ name }) => name === endpointName) ??
    doThrow<typeof endpoints[number]>(
      `This should not happen (CDN endpoint "${endpointName}" was not found.`,
    );
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
        cname: endpoint.hostName,
      },
      tTL: 1 * 60 * 60,
    },
  );
  // Add custom domain to endpoint ( must be done *after* adding record to DNS zone)
  const endpointDomainName = "published";
  if (previousDomain?.name !== endpointName) {
    eventEmitter.emit("beforeCreatingNewCDNEndpointDomain", {
      resourceGroupName,
      profileName,
      endpointName,
      endpointDomainName,
      hostname: fullDNSName,
    });
    await cdnClient.customDomains.create(
      resourceGroupName,
      profileName,
      endpointName,
      endpointDomainName,
      fullDNSName,
    );
  }
  // Enable HTTPS for the domain
  const enablingCustomHttpsEvent: events.VirtualWebsiteDeployEvents["beforeEnablingCustomHttps"] =
    {
      resourceGroupName,
      profileName,
      endpointName,
      endpointDomainName,
      hostname: fullDNSName,
    };
  eventEmitter.emit("beforeEnablingCustomHttps", enablingCustomHttpsEvent);
  let { customHttpsProvisioningState, customHttpsProvisioningSubstate } =
    await cdnClient.customDomains.get(
      resourceGroupName,
      profileName,
      endpointName,
      endpointDomainName,
    );
  if (customHttpsProvisioningState === "Disabled") {
    const start = new Date().valueOf();
    while (customHttpsProvisioningState === "Enabling") {
      await common.sleep(10 * 1000);
      eventEmitter.emit("duringEnablingCustomHttps", {
        ...enablingCustomHttpsEvent,
        customHttpsProvisioningState,
        customHttpsProvisioningSubstate,
        elapsedM: (new Date().valueOf() - start) / 1000 / 60,
      });

      ({ customHttpsProvisioningState, customHttpsProvisioningSubstate } =
        await cdnClient.customDomains.get(
          resourceGroupName,
          profileName,
          endpointName,
          endpointDomainName,
        ));
    }
  }
  eventEmitter.emit("afterEnablingCustomHttps", {
    ...enablingCustomHttpsEvent,
    state: customHttpsProvisioningState ?? "",
    subState: customHttpsProvisioningSubstate ?? "",
  });

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
    "-a", // TODO change to -s for signed commits - need some more work on this, see https://github.com/josecelano/pygithub/blob/main/docs/how_to_sign_automatic_commits_in_github_actions.md and https://github.com/actions/runner/issues/667 for more details.
    "-m",
    `Website release ${encodedTagName.version} (${encodedTagName.id}).`,
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
