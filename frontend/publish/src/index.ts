import * as process from "process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as cp from "child_process";
import { promisify } from "util";

import * as validation from "@data-heaving/common-validation";
import * as identity from "@azure/identity";
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
  const {
    organization,
    environment,
    resourceGroupName,
    relativeCodeDirectory,
    idInfo,
  } = validation.decodeOrThrow(
    config.infraConfig.decode,
    JSON.parse(
      process.env[infraConfigEnvName] ??
        doThrow(
          `Please provide infra config via "${infraConfigEnvName}" environment variable.`,
        ),
    ),
  );
  // 1. Create credentials
  let credentials: identity.TokenCredential;
  switch (auth.type) {
    case "sp":
      {
        const certPath = `${await fs.mkdtemp(
          `${os.tmpdir()}/website-deploy`,
        )}/cert.pem`;
        await fs.writeFile(certPath, `${auth.keyPEM}${auth.certPEM}`);
        credentials = new identity.ClientCertificateCredential(
          azure.tenantId,
          auth.clientId,
          certPath,
        );
        await fs.rm(certPath);
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
  if (typeof id === "string" || "id" in id) {
    const idString = typeof id === "string" ? id : id.id;
    await deploy(eventEmitter, {
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
      const tagName = ep.getTagNameFromEncoded(id);
      await execFileAsync("git", [
        "-c",
        "user.email=cd-automation@codewell-site.project",
        "-c",
        "user.name=CD Automation",
        "tag",
        "-a",
        "-m",
        `Website ${id.id} release ${id.version}.`,
        tagName,
      ]);
      await execFileAsync("git", ["push", "origin", tagName]);
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
  const tagInfo = typeof idInfo === "string" ? undefined : idInfo.tagInfo;
  let nextID:
    | string
    | { version: string; id: string; tagInfo: config.TagInfo }
    | { version: string; previousVersions: Array<string> };
  if (tagInfo) {
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
      nextID = {
        version,
        id: id,
        tagInfo,
      };
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

void (async () => {
  try {
    await main();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("ERROR", e);
    process.exit(1);
  }
})();
