import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as auth from "@pulumi/azure-native/authorization";
import * as storage from "@pulumi/azure-native/storage";
import * as cdn from "@pulumi/azure-native/cdn";
import * as nw from "@pulumi/azure-native/network";
import * as storageTypes from "@pulumi/azure-native/types/enums/storage";
import * as azureInputs from "@pulumi/azure-native/types/input";
import { URL } from "url";
import * as input from "./input";
import * as https from "./cdn-https";
import * as naming from "./naming";

const pulumiProgram = async (config: input.Configuration) => {
  const { objectId, subscriptionId } = await auth.getClientConfig();
  return pulumiResources({
    config,
    rg: await resources.getResourceGroup(config),
    websiteUploader: {
      principalId: objectId,
      roleDefinitionId: (
        await auth.getRoleDefinition({
          // From https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
          roleDefinitionId: "ba92f5b4-2d11-453d-a403-e96b0029c9fe", // "Storage Blob Data Contributor",
          scope: `/subscriptions/${subscriptionId}`,
        })
      ).id,
    },
  }).endpoints.map(
    ({
      record: {
        hostName,
        domain: { customHttpsProvisioningState },
      },
    }) => ({
      hostName,
      httpsState: customHttpsProvisioningState,
    }),
  );
};

export interface ResourcesConfiguration {
  config: Omit<input.Configuration, "resourceGroupName">;
  rg: Pick<resources.GetResourceGroupResult, "name" | "location">;
  websiteUploader: {
    principalId: string;
    roleDefinitionId: string;
  };
}

// We export this for unit tests, and also do not use resources.getResourceGroup here, as mocking that is not as simple as mocking Pulumi resources
export const pulumiResources = ({
  config: { organization, environment, endpoints },
  rg: { name: resourceGroupName, location },
  websiteUploader: { principalId, roleDefinitionId },
}: ResourcesConfiguration) => {
  const topLevelResourceID = "website";

  // CDN profile
  const profile = new cdn.Profile(topLevelResourceID, {
    resourceGroupName,
    profileName: naming.getCDNProfileName(organization, environment),
    location,
    sku: {
      name: cdn.SkuName.Standard_Microsoft, // Notice: Message="Akamai and Verizon CDN profiles cannot be created with a trial account."
    },
  });

  return {
    profile,
    endpoints: convertToArrayWithUniformItems(endpoints).map(
      ({ id, zone, dnsName }) => {
        const resourceID = `${topLevelResourceID}-${id}`;

        // SA for hosting site files (.html and .js/.css)
        const sa = new storage.StorageAccount(resourceID, {
          resourceGroupName,
          accountName: naming.getStorageAccountName(
            organization,
            environment,
            id,
          ),
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
        const blobServiceProperties = new storage.BlobServiceProperties(
          resourceID,
          {
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
          },
        );
        const staticWebsite = new storage.StorageAccountStaticWebsite(
          resourceID,
          {
            resourceGroupName,
            accountName: sa.name,
            indexDocument: "index.html",
            error404Document: "error404.html",
          },
        );

        // Custom DNS setup
        const endpointHost = sa.primaryEndpoints.web.apply(
          (r) => new URL(r).host,
        );
        const endpoint = new cdn.Endpoint(resourceID, {
          resourceGroupName,
          profileName: profile.name,
          endpointName: naming.getCDNProfileEndpointName(
            organization,
            environment,
            id,
          ),
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

        let hostName: string;
        let recordSet: nw.RecordSet | undefined;
        if (zone) {
          hostName = `${dnsName === "@" ? "" : `${dnsName}.`}${zone.zoneName}`;
          recordSet = new nw.RecordSet(hostName, {
            ...zone,
            recordType: "CNAME",
            relativeRecordSetName: dnsName,
            ttl: 3600, // TODO make this customizable
            cnameRecord: {
              cname: endpoint.hostName,
            },
          });
        } else {
          hostName = dnsName;
        }

        const domainID = `${resourceID}-${hostName}`;
        const domain = new cdn.CustomDomain(
          domainID,
          {
            resourceGroupName,
            profileName: profile.name, // Use this instead of "profileName" so that we will tell Pulumi that endpoint depends on profile
            endpointName: endpoint.name, // Use this instead of "endpointName" so that we will tell Pulumi that endpoint depends on endpoint
            customDomainName: `website-${id}`,
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
          sa,
          blobServiceProperties,
          staticWebsite,
          profile,
          endpoint,
          roleAssignment: new auth.RoleAssignment(resourceID, {
            principalId,
            principalType: "ServicePrincipal",
            roleDefinitionId,
            scope: pulumi
              .all({
                id: sa.id,
                name: staticWebsite.containerName,
              })
              .apply(
                ({ id, name }) =>
                  `${id}/blobServices/default/containers/${name}`,
              ),
          }),
          record: {
            hostName,
            recordSet,
            domain,
            httpsResource,
          },
        };
      },
    ),
  };
};

export default pulumiProgram;

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

export const convertToArrayWithUniformItems = (
  endpoints: input.Configuration["endpoints"],
) =>
  (Array.isArray(endpoints) ? endpoints : [endpoints]).flatMap((item) => {
    let result: Array<{
      id: string;
      dnsName: string;
      zone: input.ZoneInfo | undefined;
    }>;
    if (Array.isArray(item) || typeof item === "string") {
      result = (Array.isArray(item) ? item : [item]).map((dnsName) => ({
        id: dnsName,
        zone: undefined,
        dnsName,
      }));
    } else {
      if ("zone" in item) {
        const { zone } = item;
        result = Object.entries(item.records).map(([id, dnsName]) => ({
          id,
          zone,
          dnsName,
        }));
      } else {
        result = Object.entries(item.records).map(
          ([id, { zone, relativeName }]) => ({
            id,
            zone,
            dnsName: relativeName,
          }),
        );
      }
    }

    return result;
  });
