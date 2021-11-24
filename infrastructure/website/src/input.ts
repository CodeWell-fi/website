import * as t from "io-ts";
import * as validation from "@data-heaving/common-validation";

const zoneInfo = t.type(
  {
    resourceGroupName: validation.nonEmptyString,
    zoneName: validation.nonEmptyString,
  },
  "TargetDNSZoneInfo",
);

export type ZoneInfo = t.TypeOf<typeof zoneInfo>;

const makeRecordsDictionary = <T extends t.Mixed>(valueType: T) =>
  t.record(
    t.string, // Will be used in Pulumi resource IDs
    valueType,
  );

const cdnEndpointSpecification = t.union(
  [
    // When no Azure-managed zone to join to
    t.array(validation.nonEmptyString, "UnmanagedDNSNamesArray"),
    // When joining to Azure-managed DNS zone
    t.union(
      [
        t.type(
          {
            records: makeRecordsDictionary(
              t.type({
                relativeName: validation.nonEmptyString,
                zone: zoneInfo,
              }),
            ),
          },
          "ManagedDNSNamesFromMultipleZones",
        ),
        t.type(
          {
            zone: zoneInfo,
            records: makeRecordsDictionary(
              t.string, // Relative name
            ),
          },
          "ManagedDNSNamesFromOneZone",
        ),
      ],
      "ManagedDNSNames",
    ),
  ],
  "CDNEndpointSpecification",
);

export const configuration = t.type({
  resourceGroupName: validation.nonEmptyString,
  organization: validation.nonEmptyString,
  environment: validation.nonEmptyString,
  endpoints: t.union(
    [
      cdnEndpointSpecification,
      t.array(cdnEndpointSpecification, "CDNEndpointArray"),
    ],
    "CDNEndpoints",
  ),
});

export type Configuration = t.TypeOf<typeof configuration>;
