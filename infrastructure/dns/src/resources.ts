import * as resources from "@pulumi/azure-native/resources";
import * as authorization from "@pulumi/azure-native/authorization";
import * as nw from "@pulumi/azure-native/network";
import * as ad from "@pulumi/azuread";
import * as input from "./input";

const pulumiProgram = async ({
  dnsZoneName,
  additionalRecords,
  dnsZoneContributorSPNames,
  ...config
}: input.Configuration) => {
  return pulumiResources({
    rgName: (
      await resources.getResourceGroup({
        resourceGroupName: config.resourceGroupName,
      })
    ).name,
    additionalRecords,
    dnsZoneContributorSPIDs: await Promise.all(
      dnsZoneContributorSPNames.map(async (displayName) => ({
        displayName,
        principalId: (
          await ad.getServicePrincipal({
            displayName,
          })
        ).id,
      })),
    ),
    dnsZoneName,
    roleDefinitionId: (
      await authorization.getRoleDefinition({
        // From https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
        roleDefinitionId: "befefa01-2a29-4197-83a8-272ff33ce314", // "DNS Zone Contributor",
        scope: `/subscriptions/${
          (
            await authorization.getClientConfig()
          ).subscriptionId
        }`,
      })
    ).id,
  }).zone.nameServers;
};

// Using azure/ad.getXYZ methods doesn't work easily in unit tests, so we hoist them upwards and for unit tests, expose just the code which does the actual resource management.
export interface ResourcesConfiguration {
  rgName: string;
  roleDefinitionId: string;
  dnsZoneContributorSPIDs: ReadonlyArray<
    string | { displayName: string; principalId: string }
  >;
  dnsZoneName: input.Configuration["dnsZoneName"];
  additionalRecords: input.Configuration["additionalRecords"];
}
export const pulumiResources = ({
  rgName,
  roleDefinitionId,
  dnsZoneContributorSPIDs,
  dnsZoneName,
  additionalRecords,
}: ResourcesConfiguration) => {
  const zone = new nw.Zone("dns", {
    resourceGroupName: rgName,
    zoneName: dnsZoneName,
    zoneType: "Public",
    location: "global",
  });
  const records = additionalRecords.map((record) => {
    const commonProps = {
      resourceGroupName: rgName,
      zoneName: zone.name,
      relativeRecordSetName: record.relativeName,
      recordType: record.type,
      ttl: record.ttl,
    };
    const recordSetID = `${record.type}-${record.relativeName}`;
    switch (record.type) {
      case input.RecordType.A:
        return new nw.RecordSet(recordSetID, {
          ...commonProps,
          aRecords: [
            {
              ipv4Address: record.address,
            },
          ],
        });
      case input.RecordType.AAAA:
        return new nw.RecordSet(recordSetID, {
          ...commonProps,
          aaaaRecords: [
            {
              ipv6Address: record.address,
            },
          ],
        });
      case input.RecordType.CAA:
        return new nw.RecordSet(recordSetID, {
          ...commonProps,
          caaRecords: [
            {
              flags: record.flags,
              value: record.value,
              tag: record.tag,
            },
          ],
        });
      case input.RecordType.CNAME:
        return new nw.RecordSet(recordSetID, {
          ...commonProps,
          cnameRecord: {
            cname: record.cname,
          },
        });
      case input.RecordType.MX:
        return new nw.RecordSet(recordSetID, {
          ...commonProps,
          mxRecords: [
            {
              exchange: record.exchange,
              preference: record.preference,
            },
          ],
        });
      case input.RecordType.NS:
        return new nw.RecordSet(recordSetID, {
          ...commonProps,
          nsRecords: [
            {
              nsdname: record.nsdname,
            },
          ],
        });
      case input.RecordType.PTR:
        return new nw.RecordSet(recordSetID, {
          ...commonProps,
          ptrRecords: [
            {
              ptrdname: record.ptrdname,
            },
          ],
        });
      case input.RecordType.SOA:
        return new nw.RecordSet(record.type, {
          ...commonProps,
          soaRecord: {
            ...record,
          },
        });
      case input.RecordType.SRV:
        return new nw.RecordSet(recordSetID, {
          ...commonProps,
          srvRecords: [
            {
              ...record,
            },
          ],
        });
      case input.RecordType.TXT:
        return new nw.RecordSet(recordSetID, {
          ...commonProps,
          txtRecords: [
            {
              value: record.value,
            },
          ],
        });
    }
  });

  const roleAssignments = dnsZoneContributorSPIDs.map(
    (principalIdOrInfo) =>
      new authorization.RoleAssignment(
        `dns-zone-contributor-${
          typeof principalIdOrInfo === "string"
            ? principalIdOrInfo
            : principalIdOrInfo.displayName
        }`,
        {
          scope: zone.id,
          principalId:
            typeof principalIdOrInfo === "string"
              ? principalIdOrInfo
              : principalIdOrInfo.principalId,
          roleDefinitionId,
          principalType: "ServicePrincipal",
        },
      ),
  );

  return {
    zone,
    records,
    roleAssignments,
  };
};

export default pulumiProgram;
