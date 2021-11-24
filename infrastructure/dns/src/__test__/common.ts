import * as validation from "@data-heaving/common-validation";
import * as fs from "fs/promises";
import * as pulumi from "@pulumi/pulumi";
import * as input from "../input";

export const getMockedResource = <
  TParameters extends Array<unknown>,
  T extends pulumi.CustomResource,
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

export type ArgsOutputNoOptional<TArgs> = {
  [P in keyof TArgs]-?: pulumi.Output<TArgs[P]>;
};

export interface Observer {
  error(error: unknown): void;
  complete(): void;
}

export const readConfigFile = async () =>
  validation.decodeOrThrow(
    input.configuration.decode,
    JSON.parse(await fs.readFile(`./config/config.json`, "utf8")),
  );
