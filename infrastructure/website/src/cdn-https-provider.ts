import * as identity from "@azure/identity";
import * as pipeline from "@data-heaving/pulumi-azure-pipeline";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as https from "./cdn-https";

const execFileAsync = promisify(execFile);
// Since we are using @azure/identity to perform authentication, we must convert .pfx file to .pem file
export const createDynamicProvider = async (
  args: pipeline.AzureBackendPulumiProgramArgs,
) => {
  const { auth, azure } = args;
  let creds: identity.TokenCredential;
  switch (auth.type) {
    case "sp":
      {
        const passwordEnvName = "PFX_PASSWORD";
        const pw = auth.pfxPassword ?? "";
        const pemPath = auth.pfxPath.replace(/\.pfx$/, ".pem");

        await execFileAsync(
          "openssl",
          [
            "pkcs12",
            "-in",
            auth.pfxPath,
            "-out",
            pemPath,
            "-nodes",
            "-password",
            `env:${passwordEnvName}`,
          ],
          {
            env: {
              [passwordEnvName]: pw,
            },
          },
        );

        try {
          creds = new identity.ClientCertificateCredential(
            azure.tenantId,
            auth.clientId,
            pemPath,
          );
        } finally {
          await fs.rm(pemPath, { force: true });
        }
      }
      break;
    case "msi":
      creds = new identity.ManagedIdentityCredential(auth.clientId);
      break;
    default:
      throw new Error(`Unrecognized auth type ${args.auth.type}`);
  }

  return new https.CDNCustomDomainResourceProvider("default", creds);
};
