# Azure Bootstrap Pipeline Configuration
This folder contains the [configuration file](config.json) used by [Azure Bootstrap Pipeline](..).
The pipeline's source code is [DataHeaving repository](https://github.com/DataHeaving/pulumi/tree/main/azure-pipeline-bootstrap), and the schema of this config file adhers to the [specification in the pipeline source code](https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline-bootstrap/src/cli-config.ts#L113).

Let's walk through the various sections of the configuration file to get a concrete glance on things done by the pipeline:
- bootstrapperApp
- azure
- organization
- targetResources