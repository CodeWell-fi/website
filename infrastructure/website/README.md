# Azure Website Pipeline
This folder contains source code and configuration for Azure Website pipeline, the purpose of which is to create necessary infrastructure to store static website files to Azure.
This pipeline uses [Pulumi](https://pulumi.com) to manage Azure infrastructure, and stores the state using Azure resources created by [Azure Bootstrap pipeline](../bootstrap).
This way, there is no need for Pulumi Cloud credentials to run the pipeline.

The pipeline is implemented as [TypeScript](https://www.typescriptlang.org/) program which utilizes Pulumi libraries to manipulate the resources.
The pipeline is executed using [DataHeaving package](https://github.com/DataHeaving/pulumi/tree/main/azure-pipeline) `@data-heaving/pulumi-azure-pipeline`.
This package will load the code of this pipeline and run it using [Pulumi Automation API](https://www.pulumi.com/docs/guides/automation-api/), taking care of various necessary setup before that.
This setup uses credential and Pulumi information via `AZURE_PIPELINE_CONFIG` environment variable, which is contents of key vault secret by [Azure Bootstrap pipeline](../bootstrap).
This secret was once read manually and stored as [GitHub repository secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets), and is passed to the pipeline as environment variable.
The [GitHub Workflow file for dev environment](../../.github/workflows/infrastructure-dev.yml) defines the [GitHub Workflow](https://github.com/CodeWell-fi/website/actions/workflows/infrastructure-dev.yml) that uses the GitHub repository secret and the code in this folder to execute the pipeline.

# Pipeline Deployment Details
The [resources managed by the pipeline](./src/resources.ts) are:
- one or more [Azure storage accounts](https://docs.microsoft.com/en-us/azure/storage/common/storage-account-overview) with [website configuration](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website) to store the static website files,
- one [Azure CDN Profile](https://docs.microsoft.com/en-us/azure/cdn/cdn-create-new-endpoint),
- one [Azure CDN Endpoint](https://docs.microsoft.com/en-us/azure/cdn/cdn-create-new-endpoint#create-a-new-cdn-endpoint) for each storage account, associated with specified domain name, and
- one dynamic custom Pulumi resource to [enable HTTPS for each Azure CDN Endpoint](https://docs.microsoft.com/en-us/azure/cdn/cdn-custom-ssl?tabs=option-1-default-enable-https-with-a-cdn-managed-certificate).

There is further documentation about the configuration in [config subfolder](./config).