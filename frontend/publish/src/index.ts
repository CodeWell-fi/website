import * as process from "process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as validation from "@data-heaving/common-validation";
import * as id from "@azure/identity";
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
  const { organization, environment, resourceGroupName } =
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
  let certPath: string | undefined;
  let credentials: id.TokenCredential;
  switch (auth.type) {
    case "sp":
      {
        certPath = `${await fs.mkdtemp(
          `${os.tmpdir()}/website-deploy`,
        )}/cert.pem`;
        await fs.writeFile(certPath, `${auth.keyPEM}${auth.certPEM}`);
        credentials = new id.ClientCertificateCredential(
          azure.tenantId,
          auth.clientId,
          certPath,
        );
      }
      break;
    case "msi":
      credentials = new id.ManagedIdentityCredential(auth.clientId);
      break;
  }
  try {
    await deploy(
      events.consoleLoggingRunEventEmitterBuilder().createEventEmitter(),
      {
        credentials,
        websiteContainer: {
          containerURL: `https://${naming.getStorageAccountName(
            organization,
            environment,
          )}.blob.core.windows.net/$web`,
          webpageDir: path.normalize(`${process.cwd()}/../website/build`),
        },
        cdnEndpoint: {
          subscriptionId: azure.subscriptionId,
          resourceGroupName,
          ...naming.getCDNEndpointNames(organization, environment),
        },
      },
    );
  } finally {
    if (certPath) {
      await fs.rm(certPath);
    }
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
