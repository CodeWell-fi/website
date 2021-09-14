import * as identity from "@azure/identity";
import * as msRest from "@azure/ms-rest-js";
import * as pipeline from "@data-heaving/pulumi-azure-pipeline";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
let currentCredentials:
  | string
  | {
      tenantId: string;
      clientId: string;
      pemPath: string;
    }
  | undefined;

// Since we are using @azure/identity to perform authentication, we must convert .pfx file to .pem file
// We must do it here already, as e.g. read method of the provider might be called before creating resource.
export const installDynamicProvider = async ({
  auth,
  azure,
}: pipeline.AzureBackendPulumiProgramArgs) => {
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
        currentCredentials = {
          tenantId: azure.tenantId,
          clientId: auth.clientId,
          pemPath,
        };
      }
      break;
    case "msi":
      currentCredentials = auth.clientId;
      break;
  }
};

export const constructHttpClient = () => {
  if (!currentCredentials) {
    throw new Error(
      'Please run "installDynamicProvider" first in order to use this.',
    );
  }
  return new msRest.ServiceClient(
    typeof currentCredentials === "string"
      ? new identity.ManagedIdentityCredential(currentCredentials)
      : new identity.ClientCertificateCredential(
          currentCredentials.tenantId,
          currentCredentials.clientId,
          currentCredentials.pemPath,
        ),
    // Uncomment for detailed logging, which also **exposes token values to console output**!
    // {
    //   // add log policy to list of default factories.
    //   requestPolicyFactories: (factories) =>
    //     factories.concat([msRest.logPolicy()]),
    // },
  );
};
