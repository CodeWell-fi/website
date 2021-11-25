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

export const infraConfig = t.type(
  {
    organization: validation.nonEmptyString,
    environment: validation.nonEmptyString,
    resourceGroupName: validation.nonEmptyString,
    ids: t.union([
      validation.nonEmptyString,
      t.array(validation.nonEmptyString),
    ]),
  },
  "InfrastructureConfiguration",
);
