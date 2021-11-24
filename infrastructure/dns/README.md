# Azure DNS Pipeline
This folder contains source code and configuration for Azure DNS pipeline, the purpose of which is to create necessary infrastructure to manage one top-level domain.
This pipeline uses [Pulumi](https://pulumi.com) to manage Azure infrastructure, and stores the state using Azure resources created by [Azure Bootstrap pipeline](../bootstrap).
This way, there is no need for Pulumi Cloud credentials to run the pipeline.

The pipeline is implemented as [TypeScript](https://www.typescriptlang.org/) program which utilizes Pulumi libraries to manipulate the resources.
The pipeline is executed using [DataHeaving package](https://github.com/DataHeaving/pulumi/tree/main/azure-pipeline) `@data-heaving/pulumi-azure-pipeline`.
This package will load the code of this pipeline and run it using [Pulumi Automation API](https://www.pulumi.com/docs/guides/automation-api/), taking care of various necessary setup before that.
This setup uses credential and Pulumi information via `AZURE_PIPELINE_CONFIG` environment variable, which is contents of key vault secret by [Azure Bootstrap pipeline](../bootstrap).
This secret was once read manually and stored as [GitHub repository secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets), and is passed to the pipeline as environment variable.
The [GitHub Workflow file](../../.github/workflows/dns.yml) defines the [GitHub Workflow](https://github.com/CodeWell-fi/website/actions/workflows/dns.yml) that uses the GitHub repository secret and the code in this folder to execute the pipeline.

# Pipeline Deployment Details
The [resources managed by the pipeline](./src/resources.ts) are:
- one [Public DNS Zone](https://docs.microsoft.com/en-us/azure/dns/dns-zones-records) for the top-level domain,
- permissions for [Website pipeline](../website) identities to modify records within top-level domain, and
- a set of pre-configured DNS records which are not directly related to the website, but are necessary for domain functionality (e.g. `MX` record).

There is further documentation about the configuration in [config subfolder](./config).