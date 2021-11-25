import * as process from "process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as validation from "@data-heaving/common-validation";
import * as identity from "@azure/identity";
import * as config from "./config";
import * as naming from "./naming";
import * as events from "./events";
import deploy from "./deploy";

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
  const { organization, environment, resourceGroupName, ids } =
    validation.decodeOrThrow(
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
  const id = pickSuitableID(ids);
  await deploy(
    events.consoleLoggingRunEventEmitterBuilder().createEventEmitter(),
    {
      credentials,
      websiteContainer: {
        containerURL: `https://${naming.getStorageAccountName(
          organization,
          environment,
          id,
        )}.blob.core.windows.net/$web`,
        webpageDir: path.normalize(`${process.cwd()}/../code/build`),
      },
      cdnEndpoint: {
        subscriptionId: azure.subscriptionId,
        resourceGroupName,
        profileName: naming.getCDNProfileName(organization, environment),
        endpointName: naming.getCDNProfileEndpointName(
          organization,
          environment,
          id,
        ),
      },
    },
  );
};

const pickSuitableID = (ids: string | Array<string>) => {
  if (Array.isArray(ids)) {
    throw new Error("Not implemented yet.");
  } else {
    return ids;
  }
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
