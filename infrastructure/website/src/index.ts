import { env } from "process";
import * as input from "./input";
import * as validation from "@data-heaving/common-validation";
import * as pipeline from "@data-heaving/pulumi-azure-pipeline";
import pulumiProgram from "./resources";
import * as https from "./cdn-https-transient";

const doThrow = <T>(msg: string): T => {
  throw new Error(msg);
};

const configEnvName = "WEBSITE_INFRA_CONFIG";
const config = validation.decodeOrThrow(
  input.configuration.decode,
  JSON.parse(
    env[configEnvName] ??
      doThrow(
        `Please specify configuration via "${configEnvName}"" environment variable.`,
      ),
  ),
);

// For schema of this object, see `pulumiPipelineExport` object in https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline/src/cli-config.ts#L71
const pulumiPipeline: pipeline.PulumiPipelineExport = {
  plugins: [
    "azure-native", // Version will be auto-picked up from the package itself
  ],
  programConfig: {
    // The https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline-bootstrap cli tool used by bootstrap pipeline guarantees us env-specific storage account container, so project and stack name can be constants
    projectName: "website",
    stackName: "infrastructure",
    program: () => pulumiProgram(config),
  },
  beforePulumiCommandExecution: (
    args: pipeline.AzureBackendPulumiProgramArgs,
  ) =>
    // We must do it here already, as e.g. read method of the provider might be called before creating resource.
    https.installDynamicProvider(args),

  // It looks like ARM_STORAGE_USE_AZUREAD is used only by legacy Pulumi azure provider, not the new azure-native...
  // additionalParameters: {
  //   processAdditionalEnvVars: (envVars: Record<string, string>) =>
  //     Object.assign(envVars, {
  //       ARM_STORAGE_USE_AZUREAD: "true",
  //     }),
  // },
};

export default pulumiPipeline;
