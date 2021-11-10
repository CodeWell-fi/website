import test, { ExecutionContext } from "ava";
import * as pulumi from "@pulumi/pulumi";
import * as spec from "../resources";

test("Input is taken into account when creating resources", (c) => {
  const roleDefinitionId = "someRoleDefinition";
  return {
    subscribe: (observer: Observer) => {
      performTestAsync(c, observer, [
        {
          input: {
            rgName: "some-rg",
            dnsZoneName: "example.com",
            additionalRecords: [],
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
      const { zone } = spec.pulumiResources(input);
      pulumi.all([zone.name]).apply(([zoneName]) => {
        try {
          c.deepEqual(zoneName, input.dnsZoneName);
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
