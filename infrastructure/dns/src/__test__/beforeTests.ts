import test from "ava";
import * as pulumi from "@pulumi/pulumi";

// This file is ran by AVA via specifying it in package.json
// As instructed here: https://www.pulumi.com/docs/guides/testing/unit/#add-mocks
// Notice that because of how AVA works, we don't need to `await import("xyz");` for our testable files, as instructed in link above.
// Instead, we can utilize normal imports in our .spec.ts files.
test.before(() => {
  pulumi.runtime.setMocks({
    newResource: (args) => ({
      id: `${args.name}_id`,
      // The DNS zone resource is annoying - it has "zoneName" as input, but the same thing is visible as "name" in output!
      // So we have to deal with that in here.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state: Object.assign({}, { name: args.inputs.zoneName }, args.inputs), // eslint-disable-line @typescript-eslint/no-unsafe-member-access
    }),
    call: (args) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      args.inputs,
  });
});
