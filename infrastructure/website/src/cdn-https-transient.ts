import * as identity from "@azure/identity";
import * as msRest from "@azure/ms-rest-js";
import type * as pipeline from "@data-heaving/pulumi-azure-pipeline";
import { env } from "process";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
// Pulumi will serialize this whole module into state file. Therefore we use this trick with env name, because Azure credentials may differ between the runs.
// We can safely assume that tenant and client IDs will remain the same
const credentialsEnvName =
  "___PULUMI_CUSTOM_PROVIDER_AZURE_CDN_HTTPS_CREDENTIALS___";

type CredentialsEnvVar =
  | string
  | {
      tenantId: string;
      clientId: string;
      pemPath: string;
    };

// Since we are using @azure/identity to perform authentication, we must convert .pfx file to .pem file
export const installDynamicProvider = async ({
  auth,
  azure,
}: pipeline.AzureBackendPulumiProgramArgs) => {
  let creds: CredentialsEnvVar;
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

        creds = {
          tenantId: azure.tenantId,
          clientId: auth.clientId,
          pemPath,
        };
      }
      break;
    case "msi":
      creds = auth.clientId;
      break;
  }

  env[credentialsEnvName] = JSON.stringify(creds);
};

export const constructHttpClient = () => {
  const currentCredentialsString = env[credentialsEnvName];
  if (!currentCredentialsString) {
    throw new Error(
      'Please run "installDynamicProvider" first in order to use this.',
    );
  }
  const currentCredentials = JSON.parse(
    currentCredentialsString,
  ) as unknown as CredentialsEnvVar;
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

export const constructHttpClient2 = async (
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

        creds = new identity.ClientCertificateCredential(
          azure.tenantId,
          auth.clientId,
          pemPath,
        );
      }
      break;
    case "msi":
      creds = new identity.ManagedIdentityCredential(auth.clientId);
      break;
  }
  return new msRest.ServiceClient(
    creds,
    // Uncomment for detailed logging, which also **exposes token values to console output**!
    // {
    //   // add log policy to list of default factories.
    //   requestPolicyFactories: (factories) =>
    //     factories.concat([msRest.logPolicy()]),
    // },
  );
};
