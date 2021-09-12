import * as process from "process";
import * as fs from "fs/promises";
import * as os from "os";
import * as t from "io-ts";
import * as validation from "@data-heaving/common-validation";
import * as id from "@azure/identity";
import deploy from "./deploy";

const pipelineConfig = t.type({
  azure: t.type({
    tenantId: validation.uuid,
    subscriptionId: validation.uuid,
  }),
  auth: t.union([
    t.type({
      type: t.literal("sp"),
      clientId: validation.uuid,
      keyPEM: validation.nonEmptyString,
      certPEM: validation.nonEmptyString,
    }),
    t.type({
      type: t.literal("msi"),
      clientId: validation.uuid,
    }),
  ]),
});

const main = async () => {
  // 1. Create credentials
  const { auth, azure } = validation.decodeOrThrow(
    pipelineConfig.decode,
    JSON.parse(process.env.AZURE_PIPELINE_CONFIG ?? ""),
  );
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
    await deploy({
      credentials,
      websiteContainer: {
        containerURL: "",
        webpageDir: "",
      },
      cdnEndpoint: {
        subscriptionId: azure.subscriptionId,
        resourceGroupName: "",
        profileName: "",
        endpointName: "",
      },
    });
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
