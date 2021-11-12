import test, { ExecutionContext } from "ava";
import * as pulumi from "@pulumi/pulumi";
import * as nw from "@pulumi/azure-native/network";
import * as azureTypes from "@pulumi/azure-native/types";
import * as spec from "../resources";
import * as config from "../input";
import { isDeepStrictEqual } from "util";

declare module "@pulumi/pulumi" {
  // Pulumi's type declaration for this function does not cover records with different types for their values.
  // But since the implementation underneath supports even that, we just need to provide declaration with more flexible typings.
  export function all<TRecord extends Record<string, unknown>>(
    val: TRecord,
  ): pulumi.Output<{ [P in keyof TRecord]: pulumi.Unwrap<TRecord[P]> }>;
}

test("Input is taken into account when creating resources", (c) => {
  const roleDefinitionId = "someRoleDefinition";
  return {
    subscribe: (observer: Observer) => {
      performTestAsync(c, observer, [
        {
          input: {
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
            dnsZoneContributorSPIDs: [],
            roleDefinitionId,
          },
        },
      ]);
    },
  };
});

const performTestAsync = (
  c: ExecutionContext,
  observer: Observer,
  inputs: ReadonlyArray<{
    input: spec.ResourcesConfiguration;
  }>,
) => {
  try {
    inputs.forEach(({ input }) => {
      const resources = spec.pulumiResources(input);
      const zone = getMockedResource(resources.zone, nw.Zone);
      const records = resources.records.map((record) =>
        getMockedResource(record, nw.RecordSet),
      );
      pulumi
        .all({
          zoneName: zone.zoneName,
          records: pulumi
            .all(records.map(getAllRecords))
            .apply((allRecords) => {
              return allRecords
                .flatMap((r) => r)
                .map(({ commonProps, recordEntry }) => {
                  // Reverse engineer the record from Pulumi resource into same shape as config
                  const processedRecord: pulumi.Output<
                    AllOptional<config.Record>
                  > = pulumi
                    .all(commonProps)
                    .apply(({ type, ...commonProps }) => {
                      switch (type) {
                        case config.RecordType.A:
                          return pulumi.all({
                            type,
                            ...commonProps,
                            address: (
                              recordEntry as azureTypes.input.network.ARecordArgs
                            ).ipv4Address,
                          });
                        default:
                          throw new Error("");
                      }
                    });
                  return processedRecord;
                });
            }),
        })
        .apply(({ zoneName, records }) => {
          try {
            c.deepEqual(zoneName, input.dnsZoneName);
            c.deepEqual(records.length, input.additionalRecords.length);
            // Match input and output records order-insensitively
            records.every((record) => {
              c.deepEqual(
                input.additionalRecords.filter((inputRecord) =>
                  isDeepStrictEqual(inputRecord, record),
                ).length,
                1,
                `The output record ${JSON.stringify(
                  record,
                )} must have exactly one match from input records.`,
              );
            });
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
  [P in keyof TArgs]: P extends TMandatoryKey ? TArgs[P] : TArgs[P] | undefined;
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
      Object.keys(config.RecordType)
        .map(
          (rType) =>
            [
              rType,
              recordSet[RecordTypeProperties[rType as config.RecordType]],
            ] as const,
        )
        .reduce<
          {
            [P in config.RecordType]?: nw.RecordSet[typeof RecordTypeProperties[P]];
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
            type: rType as config.RecordType,
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
