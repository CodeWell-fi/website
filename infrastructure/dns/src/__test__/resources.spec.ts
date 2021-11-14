import test, { ExecutionContext } from "ava";
import * as pulumi from "@pulumi/pulumi";
import * as nw from "@pulumi/azure-native/network";
import * as auth from "@pulumi/azure-native/authorization";
import * as azureTypes from "@pulumi/azure-native/types";
import { isDeepStrictEqual } from "util";
import * as spec from "../resources";
import * as input from "../input";
import * as common from "./common";

declare module "@pulumi/pulumi" {
  // Pulumi's type declaration for this function does not cover records with different types for their values.
  // But since the implementation underneath supports even that, we just need to provide declaration with more flexible typings.
  export function all<TRecord extends Record<string, unknown>>(
    val: TRecord,
  ): pulumi.Output<{ [P in keyof TRecord]: pulumi.Unwrap<TRecord[P]> }>;
}

test("Resources created by code match the input configuration", (c) => {
  const roleDefinitionId = "someRoleDefinition";
  return {
    subscribe: (observer: Observer) => {
      void performTestAsync(c, observer, [
        // First test with very simple config
        {
          rgName: "some-rg",
          dnsZoneName: "example.com",
          additionalRecords: [
            {
              type: "A",
              relativeName: "test",
              address: "1.2.3.4",
              ttl: 3600,
            },
          ],
          dnsZoneContributorSPIDs: ["dummy-id"],
          roleDefinitionId,
        },
        // Then test with actual config (in config/config.json folder)
        async () => configFileToResourcesInput(await common.readConfigFile()),
      ]);
    },
  };
});

const configFileToResourcesInput = (
  config: input.Configuration,
): spec.ResourcesConfiguration => ({
  rgName: config.resourceGroupName,
  dnsZoneName: config.dnsZoneName,
  additionalRecords: config.additionalRecords,
  dnsZoneContributorSPIDs: config.dnsZoneContributorSPNames,
  roleDefinitionId: "dummy",
});

const performTestAsync = async (
  c: ExecutionContext,
  observer: Observer,
  inputs: ReadonlyArray<
    | spec.ResourcesConfiguration
    | (() => spec.ResourcesConfiguration | Promise<spec.ResourcesConfiguration>)
  >,
) => {
  try {
    const inputObjects = await Promise.all(
      inputs.map((config) => {
        return typeof config === "function" ? config() : config;
      }),
    );
    inputObjects.forEach((config) => {
      const resources = spec.pulumiResources(config);
      const records = resources.records.map((record) =>
        getMockedResource(record, nw.RecordSet),
      );
      pulumi
        .all({
          zoneName: getMockedResource(resources.zone, nw.Zone).zoneName,
          records: pulumi
            .all(records.map(getAllRecords))
            .apply((allRecords) => {
              return allRecords
                .flatMap((r) => r)
                .map(({ commonProps, recordEntry }) => {
                  // Reverse engineer the record from Pulumi resource into same shape as config
                  const processedRecord: pulumi.Output<
                    AllOptional<input.Record, "type">
                  > = pulumi
                    .all(commonProps)
                    .apply<AllOptional<input.Record, "type">>(
                      ({ type, ...commonProps }) => {
                        switch (type) {
                          case input.RecordType.A:
                            return pulumi.all({
                              type,
                              ...commonProps,
                              address: (
                                recordEntry as azureTypes.input.network.ARecordArgs
                              ).ipv4Address,
                            });
                          case input.RecordType.AAAA:
                            return pulumi.all({
                              type,
                              ...commonProps,
                              address: (
                                recordEntry as azureTypes.input.network.AaaaRecordArgs
                              ).ipv6Address,
                            });
                          default:
                            return pulumi.all({
                              type,
                              ...commonProps,
                              ...recordEntry,
                            });
                        }
                      },
                    );
                  return processedRecord;
                });
            }),
          roleAssignments: pulumi.all(
            resources.roleAssignments.map((roleAssignmentResource) => {
              const roleAssignment = getMockedResource(
                roleAssignmentResource,
                auth.RoleAssignment,
              );
              return {
                principalId: roleAssignment.principalId,
                roleDefinitionId: roleAssignment.roleDefinitionId,
              };
            }),
          ),
        })
        .apply(({ zoneName, records, roleAssignments }) => {
          try {
            // Match DNS zone
            c.deepEqual(zoneName, config.dnsZoneName);
            // Match DNS zone records
            c.deepEqual(records.length, config.additionalRecords.length);
            // Match input and output records order-insensitively
            for (const record of records) {
              c.deepEqual(
                config.additionalRecords.filter((inputRecord) =>
                  isDeepStrictEqual(inputRecord, record),
                ).length,
                1,
                `The output record ${JSON.stringify(
                  record,
                )} must have exactly one match from input records.`,
              );
            }
            // Match SP role assignments
            c.deepEqual(
              roleAssignments.length,
              config.dnsZoneContributorSPIDs.length,
            );
            for (const [idx, roleAssignment] of roleAssignments.entries()) {
              const spRoleAssignmentInfo = config.dnsZoneContributorSPIDs[idx];
              c.deepEqual(roleAssignment, {
                principalId:
                  typeof spRoleAssignmentInfo === "string"
                    ? spRoleAssignmentInfo
                    : spRoleAssignmentInfo.principalId,
                roleDefinitionId: config.roleDefinitionId,
              });
            }
            observer.complete();
          } catch (e) {
            observer.error(e);
          }
        });
    });
  } catch (e) {
    observer.error(e);
  }
};

export interface Observer {
  error(error: unknown): void;
  complete(): void;
}

type ArgsOutputNoOptional<TArgs> = {
  [P in keyof TArgs]-?: pulumi.Output<TArgs[P]>;
};

type AllOptional<TArgs, TMandatoryKey extends keyof TArgs = never> = {
  [P in TMandatoryKey]: TArgs[P];
} &
  {
    [P in keyof Omit<TArgs, TMandatoryKey>]?: TArgs[P] | undefined;
  };

const RecordTypeProperties = {
  A: "aRecords",
  AAAA: "aaaaRecords",
  CAA: "caaRecords",
  CNAME: "cnameRecord",
  MX: "mxRecords",
  // NAPTR: "NAPTR",
  NS: "nsRecords",
  PTR: "ptrRecords",
  SOA: "soaRecord",
  // SPF: "SPF",
  SRV: "srvRecords",
  TXT: "txtRecords",
} as const;

// This extracts all records of all record types from single record set, handling all the complexity of those being behing pulumi.Output
const getAllRecords = (recordSet: ArgsOutputNoOptional<nw.RecordSetArgs>) => {
  return pulumi
    .all(
      Object.keys(input.RecordType)
        .map(
          (rType) =>
            [
              rType,
              recordSet[RecordTypeProperties[rType as input.RecordType]],
            ] as const,
        )
        .reduce<
          {
            [P in input.RecordType]?: nw.RecordSet[typeof RecordTypeProperties[P]];
          }
        >((dict, [rType, records]) => {
          if (records) {
            // eslint-disable-next-line
            dict[rType as keyof typeof dict] = records as any;
          }
          return dict;
        }, {}),
    )
    .apply((allRecords) => {
      return Object.entries(allRecords)
        .flatMap(([rType, rEntries]) => {
          return (
            rEntries ? (Array.isArray(rEntries) ? rEntries : [rEntries]) : []
          ).map((rEntry) => [rType, rEntry] as const);
        })
        .map(([rType, rEntry]) => ({
          commonProps: {
            relativeName: recordSet.relativeRecordSetName,
            type: rType as input.RecordType,
            ttl: recordSet.ttl,
          },
          recordEntry: rEntry,
        }));
    });
};

const getMockedResource = <
  T extends pulumi.CustomResource,
  TParameters extends Array<unknown>,
>(
  resource: T,
  resourceConstructor: { new (...args: TParameters): T },
) => {
  // Our mock implementation in beforeTests.ts simply assigns inputs as outputs,
  // therefore we can just switch the type of resource passed to this method.

  // The underlying problem is that Pulumi-backed resource has differently-named properties than its inputs.
  // However, during unit-tests and mocking stage, we must either simulate corresponding behaviour (requiring rename-knowledge of all properties of all resources).
  // Or just use input-named properties in mocks, and provide this small trick to bypass typing.
  return resource as unknown as ArgsOutputNoOptional<
    ConstructorParameters<typeof resourceConstructor>[1]
  >;
};
