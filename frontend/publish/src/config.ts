import * as t from "io-ts";
import * as validation from "@data-heaving/common-validation";

export const pipelineConfig = t.type(
  {
    azure: t.type(
      {
        tenantId: validation.uuid,
        subscriptionId: validation.uuid,
      },
      "AzureInformation",
    ),
    auth: t.union(
      [
        t.type(
          {
            type: t.literal("sp"),
            clientId: validation.uuid,
            keyPEM: validation.nonEmptyString,
            certPEM: validation.nonEmptyString,
          },
          "AzureSPAuthentication",
        ),
        t.type(
          {
            type: t.literal("msi"),
            clientId: validation.uuid,
          },
          "AzureMSIAuthentication",
        ),
      ],
      "AzureAuthentication",
    ),
  },
  "PipelineConfiguration",
);

const tagInfo = t.type(
  {
    prefix: validation.nonEmptyString,
    versionSeparator: validation.nonEmptyString,
  },
  "PublishingTagInfo",
);

export type TagInfo = t.TypeOf<typeof tagInfo>;

const idInfo = t.union(
  [
    // Just one ID and no tag information (e.g. dev env)
    validation.nonEmptyString,
    // Just one ID with tag information (e.g. test/qa)
    t.type(
      {
        id: validation.nonEmptyString,
        tagInfo,
      },
      "SingleIDWithTags",
    ),
    // Multiple IDs (e.g. prod with blue-green deployment)
    t.type(
      {
        ids: t.array(validation.nonEmptyString),
        tagInfo,
        zone: t.intersection([
          t.type({
            resourceGroupName: validation.nonEmptyString,
            name: validation.nonEmptyString,
          }),
          t.partial({
            relativeRecordName: validation.nonEmptyString,
          }),
        ]),
      },
      "MultipleIDs",
    ),
  ],
  "IDInfo",
);

export type IDInfo = t.TypeOf<typeof idInfo>;

export const infraConfig = t.type(
  {
    organization: validation.nonEmptyString,
    environment: validation.nonEmptyString,
    resourceGroupName: validation.nonEmptyString,
    relativeCodeDirectory: validation.nonEmptyString,
    idInfo,
  },
  "InfrastructureConfiguration",
);

export type InfraConfig = t.TypeOf<typeof infraConfig>;

export const packageJsonWithVersion = t.type({
  version: validation.nonEmptyString,
});
