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

const domainNameList = t.array(
  t.union([
    validation.nonEmptyString,
    t.type(
      {
        zone: zoneInfo,
        relativeName: validation.nonEmptyString,
      },
      "ZoneJoinInfo",
    ),
  ]),
  "DomainNameList",
);

export const configuration = t.type({
  resourceGroupName: validation.nonEmptyString,
  organization: validation.nonEmptyString,
  environment: validation.nonEmptyString,
  domainNames: t.union(
    [
      domainNameList,
      t.type({
        defaultZone: zoneInfo,
        domains: domainNameList,
      }),
    ],
    "DomainNameJoinConfiguration",
  ),
});

export type Configuration = t.TypeOf<typeof configuration>;
