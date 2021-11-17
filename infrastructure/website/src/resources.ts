import type * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as cdn from "@pulumi/azure-native/cdn";
import * as nw from "@pulumi/azure-native/network";
import * as storageTypes from "@pulumi/azure-native/types/enums/storage";
import * as azureInputs from "@pulumi/azure-native/types/input";
import { URL } from "url";
import * as input from "./input";
import * as https from "./cdn-https";
import * as naming from "./naming";

const pulumiProgram = async (config: input.Configuration) =>
  pulumiResources({
    config,
    rg: await resources.getResourceGroup(config),
  }).records.map(({ hostName, domain: { customHttpsProvisioningState } }) => ({
    hostName,
    httpsState: customHttpsProvisioningState,
  }));

export interface ResourcesConfiguration {
  config: Omit<input.Configuration, "resourceGroupName">;
  rg: Pick<resources.GetResourceGroupResult, "name" | "location">;
}

// We export this for unit tests, and also do not use resources.getResourceGroup here, as mocking that is not as simple as mocking Pulumi resources
export const pulumiResources = ({
  config: { organization, environment, domainNames },
  rg: { name: resourceGroupName, location },
}: ResourcesConfiguration) => {
  const resourceID = "website";

  // CDN profile
  const { profileName, endpointName } = naming.getCDNEndpointNames(
    organization,
    environment,
  );
  const profile = new cdn.Profile(resourceID, {
    resourceGroupName,
    profileName,
    location,
    sku: {
      name: cdn.SkuName.Standard_Microsoft, // Notice: Message="Akamai and Verizon CDN profiles cannot be created with a trial account."
    },
  });

  // SA for hosting site files (.html and .js/.css)
  const sa = new storage.StorageAccount(resourceID, {
    resourceGroupName,
    accountName: naming.getStorageAccountName(organization, environment),
    sku: {
      name: storage.SkuName.Standard_RAGRS,
    },
    location,
    kind: storage.Kind.StorageV2,
    enableHttpsTrafficOnly: true, // We will handle http -> https redirect in CDN profile
    accessTier: storage.AccessTier.Hot,
    allowBlobPublicAccess: true, // This will be hosting website, so has to be public
    allowSharedKeyAccess: true, // Nothing like ARM_STORAGE_USE_AZUREAD in azure-native provider yet, so we must still use this
    minimumTlsVersion: storageTypes.MinimumTlsVersion.TLS1_2,
  });
  const blobServiceProperties = new storage.BlobServiceProperties(resourceID, {
    resourceGroupName,
    accountName: sa.name,
    blobServicesName: "default",
    isVersioningEnabled: false,
    cors: {
      corsRules: [],
    },
    deleteRetentionPolicy: {
      enabled: false,
    },
  });
  const staticWebsite = new storage.StorageAccountStaticWebsite(resourceID, {
    resourceGroupName,
    accountName: sa.name,
    indexDocument: "index.html",
    error404Document: "error404.html",
  });

  // Custom DNS setup
  const endpointHost = sa.primaryEndpoints.web.apply((r) => new URL(r).host);
  const endpoint = new cdn.Endpoint(resourceID, {
    resourceGroupName,
    profileName: profile.name, // Use this instead of "profileName" so that we will tell Pulumi that endpoint depends on profile
    endpointName,
    isHttpAllowed: true,
    isHttpsAllowed: true,
    isCompressionEnabled: true,
    originHostHeader: endpointHost,
    contentTypesToCompress,
    origins: [
      {
        name: "cdn-origin",
        hostName: endpointHost,
        originHostHeader: endpointHost,
        httpsPort: 443,
        httpPort: 80,
      },
    ],
    deliveryPolicy,
  });
  const defaultZone = Array.isArray(domainNames)
    ? undefined
    : domainNames.defaultZone;

  const domainNameArray = Array.isArray(domainNames)
    ? domainNames
    : domainNames.domains;

  return {
    sa,
    blobServiceProperties,
    staticWebsite,
    profile,
    endpoint,
    records: domainNameArray.map((domainName) => {
      let hostName: string;
      let recordSet: nw.RecordSet | undefined;
      if (typeof domainName === "string" && !defaultZone) {
        hostName = domainName;
      } else {
        const relativeName =
          typeof domainName === "string" ? domainName : domainName.relativeName;
        const zone =
          typeof domainName === "string"
            ? defaultZone ?? doThrow<input.ZoneInfo>("This should never happen")
            : domainName.zone;
        hostName = `${relativeName === "@" ? "" : `${relativeName}.`}${
          zone.zoneName
        }`;
        recordSet = new nw.RecordSet(hostName, {
          ...zone,
          recordType: "CNAME",
          relativeRecordSetName: relativeName,
          ttl: 3600, // TODO make this customizable
          cnameRecord: {
            cname: endpoint.hostName,
          },
        });
      }

      const domainID = `${resourceID}-${hostName}`;
      const domain = new cdn.CustomDomain(
        domainID,
        {
          resourceGroupName,
          profileName: profile.name, // Use this instead of "profileName" so that we will tell Pulumi that endpoint depends on profile
          endpointName: endpoint.name, // Use this instead of "endpointName" so that we will tell Pulumi that endpoint depends on endpoint
          customDomainName: "website",
          hostName,
        },
        {
          dependsOn: recordSet,
        },
      );

      const httpsResource = new https.CDNCustomDomainHTTPSResource(
        domainID,
        {
          domainID: domain.id,
          httpsEnabled: true,
        },
        {
          parent: domain,
        },
      );
      return {
        hostName,
        recordSet,
        domain,
        httpsResource,
      };
    }),
  };
};

export default pulumiProgram;

const doThrow = <T>(message: string): T => {
  throw new Error(message);
};

export const contentTypesToCompress = [
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "application/x-javascript",
  "application/javascript",
  "application/json",
  "application/xml",
  "image/png",
  "image/jpeg",
];

export const deliveryPolicy: pulumi.Unwrap<azureInputs.cdn.EndpointPropertiesUpdateParametersDeliveryPolicyArgs> =
  {
    description: "",
    rules: [
      {
        order: 1,
        name: "EnforceHTTPS",
        conditions: [
          {
            name: "RequestScheme",
            parameters: {
              odataType:
                "#Microsoft.Azure.Cdn.Models.DeliveryRuleRequestSchemeConditionParameters",
              matchValues: ["HTTP"],
              operator: "Equal",
              negateCondition: false,
            },
          },
        ],
        actions: [
          {
            name: "UrlRedirect",
            parameters: {
              odataType:
                "#Microsoft.Azure.Cdn.Models.DeliveryRuleUrlRedirectActionParameters",
              redirectType: "Found",
              destinationProtocol: "Https",
            },
          },
        ],
      },
    ],
  };
