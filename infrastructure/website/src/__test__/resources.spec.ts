import test, { ExecutionContext } from "ava";
import * as pulumi from "@pulumi/pulumi";
import * as nw from "@pulumi/azure-native/network";
import * as storage from "@pulumi/azure-native/storage";
import * as cdn from "@pulumi/azure-native/cdn";
import { URL } from "url";
import * as spec from "../resources";
import * as input from "../input";
import * as cdnHttps from "../cdn-https";
import * as common from "./common";

declare module "@pulumi/pulumi" {
  // Pulumi's type declaration for this function does not cover records with different types for their values.
  // But since the implementation underneath supports even that, we just need to provide declaration with more flexible typings.
  export function all<TRecord extends Record<string, unknown>>(
    val: TRecord,
  ): pulumi.Output<{ [P in keyof TRecord]: pulumi.Unwrap<TRecord[P]> }>;
}

const testResources = test.macro(
  (
    c,
    resourceSpec:
      | spec.ResourcesConfiguration
      | (() =>
          | spec.ResourcesConfiguration
          | Promise<spec.ResourcesConfiguration>),
  ) => ({
    subscribe: (observer: common.Observer) => {
      void performTestAsync(c, observer, resourceSpec);
    },
  }),
);

test("Simple configuration produces correct resources", testResources, {
  config: {
    organization: "dummy",
    environment: "dev",
    endpoints: "dummy",
  },
  rg: {
    name: "dummy",
    location: "dummy",
  },
});

test(
  "Development configuration produces correct resources",
  testResources,
  async () => configFileToResourcesInput(await common.readConfigFile("dev")),
);

test(
  "Production configuration produces correct resources",
  testResources,
  async () => configFileToResourcesInput(await common.readConfigFile("prod")),
);

const configFileToResourcesInput = (
  config: input.Configuration,
): spec.ResourcesConfiguration => ({
  config,
  rg: {
    name: "dummy",
    location: "dummy",
  },
});

const performTestAsync = async (
  c: ExecutionContext,
  observer: common.Observer,
  input:
    | spec.ResourcesConfiguration
    | (() =>
        | spec.ResourcesConfiguration
        | Promise<spec.ResourcesConfiguration>),
) => {
  try {
    const configObj = typeof input === "function" ? await input() : input;
    const { profile, endpoints } = spec.pulumiResources(configObj);
    const { config, rg } = configObj;
    pulumi
      // If we pass pulumi resources as-is to pulumi.all, it won't process the outputs (for one reason or another).
      .all({
        profile: common.pickFromMockedResource(
          profile,
          cdn.Profile,
          "resourceGroupName",
          "profileName",
        ),
        endpoints: endpoints.map(
          ({
            sa,
            blobServiceProperties,
            staticWebsite,
            endpoint,
            record: { domain, recordSet, httpsResource, ...record },
          }) => ({
            sa: common.pickFromMockedResource(
              sa,
              storage.StorageAccount,
              "accountName",
              "allowBlobPublicAccess",
              "enableHttpsTrafficOnly",
              "minimumTlsVersion",
              "networkRuleSet",
              "resourceGroupName",
            ),
            endpointHost: sa.primaryEndpoints.web.apply(
              (url) => new URL(url).host,
            ),
            blobServiceProperties: common.pickFromMockedResource(
              blobServiceProperties,
              storage.BlobServiceProperties,
              "isVersioningEnabled",
            ),
            staticWebsite: common.pickFromMockedResource(
              staticWebsite,
              storage.StorageAccountStaticWebsite,
              "indexDocument",
            ),
            endpoint: common.pickFromMockedResource(
              endpoint,
              cdn.Endpoint,
              "resourceGroupName",
              "profileName",
              "endpointName",
              "isHttpAllowed",
              "isHttpsAllowed",
              "isCompressionEnabled",
              "contentTypesToCompress",
              "origins",
              "deliveryPolicy",
            ),
            cdnEndpointHost: endpoint.hostName,
            record: {
              ...record,
              domain: common.pickFromMockedResource(
                domain,
                cdn.CustomDomain,
                "resourceGroupName",
                "profileName",
                "endpointName",
                "customDomainName",
                "hostName",
              ),
              recordSet: recordSet
                ? common.pickFromMockedResource(
                    recordSet,
                    nw.RecordSet,
                    "recordType",
                    "cnameRecord",
                    "relativeRecordSetName",
                    "ttl",
                  )
                : undefined,
              httpsResource: common.pickFromMockedResource(
                httpsResource,
                cdnHttps.CDNCustomDomainHTTPSResource,
                "httpsEnabled",
              ),
            },
          }),
        ),
      })
      .apply(({ profile, endpoints }) => {
        try {
          // CDN Profile
          const expectedProfile = {
            resourceGroupName: rg.name,
            profileName: `${config.organization}-${config.environment}`,
          };
          c.deepEqual(profile, expectedProfile);
          const uniformEndpoints = spec.convertToArrayWithUniformItems(
            config.endpoints,
          );
          c.deepEqual(uniformEndpoints.length, endpoints.length);
          endpoints.forEach(
            (
              {
                sa,
                blobServiceProperties,
                staticWebsite,
                endpointHost,
                cdnEndpointHost,
                endpoint,
                record,
              },
              idx,
            ) => {
              const { zone, ...uniformEndpoint } = uniformEndpoints[idx];
              // Storage account
              c.deepEqual(sa, {
                accountName: `${config.organization}${config.environment}site${uniformEndpoint.id}`,
                allowBlobPublicAccess: true, // Public website - don't require Azure authentication to access data
                enableHttpsTrafficOnly: true, // Disallow unencrypted traffic (notice that CDN allows http, but only for http -> https redirect)
                minimumTlsVersion: "TLS1_2",
                networkRuleSet: undefined, // Public website - no firewall configs (TODO should we only allow access for AzureCDN range?)
                resourceGroupName: rg.name,
              });
              c.deepEqual(blobServiceProperties, {
                isVersioningEnabled: false, // Website just has static files, no need for versioning
              });
              c.deepEqual(staticWebsite, {
                indexDocument: "index.html", // Must be same name as .html file in frontend/code/public folder
              });

              // CDN Endpoint
              const expectedEndpoint = {
                resourceGroupName: rg.name,
                profileName: expectedProfile.profileName,
                endpointName: `${config.organization}-${config.environment}-${uniformEndpoint.id}`,
                isCompressionEnabled: true,
                isHttpAllowed: true, // For http -> https redirect, instead of giving error on http
                isHttpsAllowed: true, // Https is the only really useable protocol
                contentTypesToCompress: spec.contentTypesToCompress,
                origins: [
                  {
                    name: "cdn-origin",
                    hostName: endpointHost,
                    originHostHeader: endpointHost,
                    httpsPort: 443,
                    httpPort: 80,
                  },
                ],
                deliveryPolicy: spec.deliveryPolicy,
              };
              c.deepEqual(endpoint, expectedEndpoint);
              const hasCNameRecord = !!zone;
              const hostName = hasCNameRecord
                ? `${uniformEndpoint.dnsName}.${zone.zoneName}`
                : uniformEndpoint.dnsName;
              c.deepEqual(record, {
                hostName,
                domain: {
                  resourceGroupName: rg.name,
                  profileName: expectedProfile.profileName,
                  endpointName: expectedEndpoint.endpointName,
                  customDomainName: `website-${uniformEndpoint.id}`,
                  hostName,
                },
                recordSet: hasCNameRecord
                  ? {
                      recordType: "CNAME",
                      cnameRecord: {
                        cname: cdnEndpointHost,
                      },
                      relativeRecordSetName: uniformEndpoint.dnsName,
                      ttl: 3600,
                    }
                  : undefined,
                httpsResource: {
                  httpsEnabled: true,
                },
              });
            },
          );
          observer.complete();
        } catch (e) {
          observer.error(e);
        }
      });
  } catch (e) {
    observer.error(e);
  }
};
