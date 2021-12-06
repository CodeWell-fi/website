import test from "ava";
import * as pulumi from "@pulumi/pulumi";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

// This file is ran by AVA via specifying it in package.json
// As instructed here: https://www.pulumi.com/docs/guides/testing/unit/#add-mocks
// Notice that because of how AVA works, we don't need to `await import("xyz");` for our testable files, as instructed in link above.
// Instead, we can utilize normal imports in our .spec.ts files.
test.before(() => {
  pulumi.runtime.setMocks({
    newResource: (args) => {
      return {
        id: `${args.name}_id`,
        state:
          args.type in customHandling
            ? Object.assign(
                {},
                args.inputs,
                customHandling[args.type](args.inputs),
              )
            : args.inputs,
      };
    },
    call: (args) => args.inputs,
  });
});

const customHandling: Record<string, (inputs: any) => Record<string, any>> = {
  "azure-native:storage:StorageAccount": (inputs) => ({
    primaryEndpoints: {
      web: `https://${inputs.accountName}.web.windows.core.net/$web`,
    },
  }),
  "azure-native:storage:StorageAccountStaticWebsite": () => ({
    containerName: "$web",
  }),
  "azure-native:cdn:Profile": (inputs) => ({
    name: inputs.profileName,
  }),
  "azure-native:cdn:Endpoint": (inputs) => ({
    name: inputs.endpointName,
    hostName: `${inputs.endpointName}.azureedge.net`,
  }),
};
