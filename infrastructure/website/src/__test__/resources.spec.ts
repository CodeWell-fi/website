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
  const rg: spec.ResourcesConfiguration["rg"] = {
    name: "dummy",
    location: "dummy",
  };
  return {
    subscribe: (observer: common.Observer) => {
      void performTestAsync(c, observer, [
        // First test with very simple config
        {
          config: {
            organization: "dummy",
            environment: "dev",
            domainNames: ["dummy"],
          },
          rg,
        },
        // Then test with actual config (in config/config.json folder)
        async () => configFileToResourcesInput(await common.readConfigFile()),
      ]);
    },
  };
});

const configFileToResourcesInput = (
  config: input.Configuration,
): spec.ResourcesConfiguration => {
  throw new Error("TODO");
};

const performTestAsync = async (
  c: ExecutionContext,
  observer: common.Observer,
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
    });
  } catch (e) {
    observer.error(e);
  }
};
