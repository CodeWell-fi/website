import * as pulumi from "@pulumi/pulumi";
import * as azureUtils from "@pulumi/azure-native/utilities";
import * as identity from "@azure/identity";
import * as msRest from "@azure/ms-rest-js";
import * as t from "io-ts";
import * as utils from "@data-heaving/common";
// import * as validation from "@data-heaving/common-validation";
import * as pipeline from "@data-heaving/pulumi-azure-pipeline";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
// Notice! The validation objects in io-ts library can not be used by Pulumi Dynamic Custom Provider ( CDNCustomDomainResourceProvider class below ).
// The reason is that if the validation objects are used, the Pulumi fails with the following error
//
// pulumi:pulumi:Stack (infrastructure):
// error: Error serializing '() => provider'
//
// '() => provider': captured
//   variable 'provider' which indirectly referenced
//     function 'CDNCustomDomainResourceProvider': which referenced
//       function 'check': which captured
//         variable 'dynamicProviderInputs' which indirectly referenced
//           function 'bound ': which could not be serialized because
//             it was a native code function.
//
// Function code:
//   function () { [native code] }

// So, unfortunately, the runtime validation of objects will have to wait for when that problem is solved
// Generic issue about this exists here: https://github.com/pulumi/pulumi/issues/5294
// The original problem stems from the fact explained here: https://www.pulumi.com/docs/intro/concepts/resources/#dynamicproviders :
// "Because your implementation of the resource provider interface must be used by a different process, potentially at a different point in time, dynamic providers are built on top of the same function serialization that is used for turning callbacks into AWS Lambdas or Google Cloud Functions."
//
// I tried downgrading io-ts (including major version), and downgrading/upgrading fp-ts, however the problem did not go away.
// This is pretty damn severe limitation, which I hope will be fixed in either Pulumi or io-ts at some point.
// The interesting thing is, the code ending up in Pulumi backend file is only from this file - while the native function is in the library.
// So Pulumi will nevertheless need to load the library containing native function even in different process, therefore I think Pulumi is a bit overreacting here.
export type CustomDomainHTTPSOptions = {
  [P in keyof DynamicProviderInputs]: P extends "azureConfig"
    ? DynamicProviderInputs[P]
    : pulumi.Input<DynamicProviderInputs[P]>;
};

const dynamicProviderInputs = t.type(
  {
    domainID: t.string,
    httpsEnabled: t.boolean,
    // We must pass azure config like this - if we try to use Pulumi's Azure Provider's getToken function (from "@pulumi/azure-native/authorization"), we will get (a rather mystical) error:
    //
    // pulumi.errors.RunError: Program run without the Pulumi engine available; re-run using the 'pulumi' CLI
    //
    // It is because providers are isolated - therefore our custom dynamic provider can't access other provider's configuration
    // More info: https://github.com/pulumi/pulumi/issues/2580#issuecomment-781559171
    // azureConfig: t.intersection(
    //   [
    //     t.type(
    //       {
    //         clientId: validation.uuid,
    //         subscriptionId: validation.uuid,
    //         tenantId: validation.uuid,
    //       },
    //       "CustomDNSHTTPSEnablingInputsAzureConfigMandatory",
    //     ),
    //     t.partial(
    //       {
    //         clientCertificatePath: validation.nonEmptyString,
    //       },
    //       "CustomDNSHTTPSEnablingInputsAzureConfigOptional",
    //     ),
    //   ],
    //   "CustomDNSHTTPSEnablingInputsAzureConfig",
    // ),
  },
  "CustomDNSHTTPSEnablingInputs",
);

type DynamicProviderInputs = t.TypeOf<typeof dynamicProviderInputs>;

type DynamicProviderOutputs = Omit<DynamicProviderInputs, "token"> & {
  name: string;
};

// See: https://docs.microsoft.com/en-us/rest/api/cdn/cdn/custom-domains/enable-custom-https#cdncertificatesourceparameters
interface EnableHttpsParametersCdn {
  certificateSource: "Cdn";
  protocolType: "ServerNameIndication" | "IPBased";
  minimumTlsVersion?: "None" | "TLS10" | "TLS12";
  certificateSourceParameters: {
    ["@odata.type"]: "#Microsoft.Azure.Cdn.Models.CdnCertificateSourceParameters";
    certificateType: "Dedicated" | "Shared";
  };
}

const DefaultHttpsParametersCdn: EnableHttpsParametersCdn = {
  certificateSource: "Cdn",
  protocolType: "ServerNameIndication",
  minimumTlsVersion: "TLS12",
  certificateSourceParameters: {
    ["@odata.type"]:
      "#Microsoft.Azure.Cdn.Models.CdnCertificateSourceParameters",
    certificateType: "Dedicated",
  },
};

const customDomainResponse = t.type(
  {
    type: t.string,
    name: t.string,
    id: t.string,
    properties: t.type(
      {
        provisioningState: t.string,
        resourceState: t.union(
          [t.literal("Active"), t.literal("Creating"), t.literal("Deleting")],
          "CustomDomainResourceState",
        ),
        hostName: t.string,
        customHttpsProvisioningState: t.union(
          [
            t.literal("Disabled"),
            t.literal("Disabling"),
            t.literal("Enabled"),
            t.literal("Enabling"),
            t.literal("Failed"),
          ],
          "CustomHttpsProvisioningState",
        ),
        customHttpsProvisioningSubstate: t.union(
          [
            t.literal("CertificateDeleted"),
            t.literal("CertificateDeployed"),
            t.literal("DeletingCertificate"),
            t.literal("DeployingCertificate"),
            t.literal("DomainControlValidationRequestApproved"),
            t.literal("DomainControlValidationRequestRejected"),
            t.literal("DomainControlValidationRequestTimedOut"),
            t.literal("IssuingCertificate"),
            t.literal("PendingDomainControlValidationREquestApproval"),
            t.literal("SubmittingDomainControlValidationRequest"),
          ],
          "CustomHttpsProvisioningSubstate",
        ),
      },
      "CustomDomainProperties",
    ),
  },
  "CustomDomainResponse",
);

type CustomDomainResponse = t.TypeOf<typeof customDomainResponse>;

const constructURLFromDomainID = (domainID: string) =>
  `https://management.azure.com${domainID
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;

const constructHttpClient = () => {
  if (!currentCredentials) {
    throw new Error(
      'Please run "installDynamicProvider" first in order to use this.',
    );
  }
  return new msRest.ServiceClient(
    currentCredentials,
    // Uncomment for detailed logging, which also **exposes token values to console output**!
    // {
    //   // add log policy to list of default factories.
    //   requestPolicyFactories: (factories) =>
    //     factories.concat([msRest.logPolicy()]),
    // },
  );
};

const urlSuffix = `?api-version=2020-09-01`;
const deserializeCustomDomainResponse = (
  response: msRest.HttpOperationResponse,
) => JSON.parse(response.bodyAsText ?? "") as CustomDomainResponse;
// We can not use customDomainResponse because of function serialization issue.
// validation.decodeOrThrow(
//   customDomainResponse.decode,
//   JSON.parse(response.body)
// );

const performHttpsChange = async (domainID: string, enableHttps: boolean) => {
  const url = constructURLFromDomainID(domainID);
  const httpClient = constructHttpClient();
  let response = await httpClient.sendRequest({
    url: `${url}/${enableHttps ? "enable" : "disable"}CustomHttps${urlSuffix}`,
    method: "POST",
    body: enableHttps ? DefaultHttpsParametersCdn : undefined,
  });
  if (response.status !== 200 && response.status !== 202) {
    const errorMsg = `Initial request failed with ${response.status}:\n${response.bodyAsText}.`;
    await pulumi.log.error(errorMsg, undefined, undefined, true);
    throw new Error(errorMsg);
  }
  const targetState: CustomDomainResponse["properties"]["customHttpsProvisioningState"] =
    enableHttps ? "Enabled" : "Disabled";
  let domainResponse: CustomDomainResponse;
  while (
    (domainResponse = deserializeCustomDomainResponse(response)).properties
      .customHttpsProvisioningState !== targetState
  ) {
    if (domainResponse.properties.customHttpsProvisioningState === "Failed") {
      const errorMsg = `Enabling HTTPS failed: ${domainResponse.properties.customHttpsProvisioningSubstate}.`;
      await pulumi.log.error(errorMsg, undefined, undefined, true);
      throw new Error(errorMsg);
    }
    await pulumi.log.info(
      `Waiting ... ${domainResponse.properties.customHttpsProvisioningState} ${domainResponse.properties.customHttpsProvisioningSubstate}`,
      undefined,
      undefined,
      true,
    );
    await utils.sleep(10000);
    response = await httpClient.sendRequest({
      url: `${url}${urlSuffix}`,
      method: "GET",
    });
  }
};

class CDNCustomDomainResourceProvider
  implements pulumi.dynamic.ResourceProvider
{
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async create(
    inputs: DynamicProviderInputs,
  ): Promise<pulumi.dynamic.CreateResult> {
    const { httpsEnabled } = (await this.performRead(inputs, "unused")).props;
    // Enabling HTTPS is a long (15ish mins at best) operation, and Azure doesn't make it no-op if it is already enabled.
    // So only do it if needed
    if (httpsEnabled !== inputs.httpsEnabled) {
      await performHttpsChange(inputs.domainID, inputs.httpsEnabled);
    }

    const outs: DynamicProviderOutputs = {
      ...inputs,
      name: this.name,
    };

    return { id: inputs.domainID, outs: outs };
  }

  check(
    olds: DynamicProviderInputs,
    news: DynamicProviderInputs,
  ): Promise<pulumi.dynamic.CheckResult> {
    return Promise.resolve({
      inputs: news,
    });
    // We can not use dynamicProviderInputs because of function serialization issue.
    // const maybeValidatedNews = dynamicProviderInputs.decode(news);
    // return Promise.resolve(
    //   isRight(maybeValidatedNews)
    //     ? { inputs: maybeValidatedNews.right }
    //     : {
    //         failures: maybeValidatedNews.left.map((e) => ({
    //           property: e.context.map((c) => c.key).join("."),
    //           reason: e.message ?? "Unkown reason",
    //         })),
    //       }
    // );
  }

  diff(
    id: string,
    previousOutput: DynamicProviderOutputs,
    news: DynamicProviderInputs,
  ): Promise<pulumi.dynamic.DiffResult> {
    const idDifferent = previousOutput.domainID !== news.domainID;
    return Promise.resolve({
      deleteBeforeReplace: idDifferent,
      replaces: idDifferent ? ["domainID"] : [],
      changes: idDifferent || previousOutput.httpsEnabled !== news.httpsEnabled,
    });
  }

  async read(
    id: string,
    currentProps: DynamicProviderOutputs,
  ): Promise<pulumi.dynamic.ReadResult> {
    return this.performRead(currentProps, currentProps.name);
  }

  async update(
    id: string,
    currentOutputs: DynamicProviderOutputs,
    newInputs: DynamicProviderInputs,
  ): Promise<pulumi.dynamic.UpdateResult> {
    // We have two inputs, domainID causes recreation and thus changing that will not enter here
    // The only remaining possibility is change of httpsEnabled
    await performHttpsChange(newInputs.domainID, newInputs.httpsEnabled);
    currentOutputs.httpsEnabled = newInputs.httpsEnabled;
    return {
      outs: currentOutputs,
    };
  }

  async delete(id: string, props: DynamicProviderOutputs): Promise<void> {
    // Deleting this resource => disabling https
    if (props.httpsEnabled) {
      await performHttpsChange(props.domainID, false);
    }
  }

  private async performRead(currentProps: DynamicProviderInputs, name: string) {
    const customDomainState = deserializeCustomDomainResponse(
      await constructHttpClient().sendRequest({
        url: `${constructURLFromDomainID(currentProps.domainID)}${urlSuffix}`,
        method: "GET",
      }),
    );
    const props: DynamicProviderOutputs = {
      domainID: customDomainState.id,
      httpsEnabled:
        customDomainState.properties.customHttpsProvisioningState === "Enabled",
      name,
    };
    return {
      id: customDomainState.id,
      props,
    };
  }
}

export class CDNCustomDomainHTTPSResource extends pulumi.dynamic.Resource {
  constructor(
    name: string,
    args: CustomDomainHTTPSOptions,
    opts?: pulumi.CustomResourceOptions,
  ) {
    opts = pulumi.mergeOptions(opts, {
      version: azureUtils.getVersion(),
      additionalSecretOutputs: ["azureConfig"],
    });
    super(
      new CDNCustomDomainResourceProvider(name),
      `azure-native-custom:cdn:CustomDomainHttpsHandler:${name}`,
      args,
      opts,
    );
  }
}

let currentCredentials: identity.TokenCredential | undefined;

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
        currentCredentials = new identity.ClientCertificateCredential(
          azure.tenantId,
          auth.clientId,
          pemPath,
        );
      }
      break;
    case "msi":
      currentCredentials = new identity.ManagedIdentityCredential(
        auth.clientId,
      );
      break;
  }
};
