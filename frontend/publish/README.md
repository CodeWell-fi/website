# Website UI CI/CD Pipeline
This folder contains source code and configuration for Website UI CI/CD pipeline, the purpose of which is to upload the resulting static website files produced by [Website UI pipeline].
This pipeline uses `@azure/xyz` libraries to perform its tasks.
The credentials to perform Azure operations are passed via `AZURE_PIPELINE_CONFIG_DEV` env variable, contents of which were retrived from key vault secret created by [Azure Bootstrap pipeline](/infrastructure/bootstrap).

The pipeline is implemented as [TypeScript](https://www.typescriptlang.org/) program which utilizes Node Azure libraries (e.g. [@azure/arm-cdn](https://www.npmjs.com/package/@azure/arm-cdn) and [@azure/storage-blob](https://www.npmjs.com/package/@azure/storage-blob)) to perform the task.
The pipeline is executed as a normal Node application.
This setup uses credential information via `AZURE_PIPELINE_CONFIG` environment variable, which is contents of key vault secret by [Azure Bootstrap pipeline](../bootstrap).
This secret was once read manually and stored as [GitHub repository secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets), and is passed to the pipeline as environment variable.
The [GitHub Workflow file for dev environment](../../.github/workflows/website-cd-dev.yml) defines the [GitHub Workflow](https://github.com/CodeWell-fi/website/actions/workflows/website-cd-dev.yml) that uses the GitHub repository secret and the code in this folder to execute the pipeline.

# Pipeline Deployment Details
The process starts by [Website UI Build pipeline](../../.github/workflows/website-ci.yml) triggering when PR containing changes to [Website UI Folder](../code) is merged to `main` branch.
The pipeline will build the `.js`, `.html`, and other files, and store them as pipeline artifacts.
The pipeline code defined in this folder will then run after the build pipeline is completed.

The [main logic of this pipeline](./src/deploy.ts) is to:
1. List all existing blobs in target storage account website container.
2. Upload new files, produced by the [Website UI Build pipeline](../../.github/workflows/website-ci.yml), to the website container.
3. Delete any old files that were not overwritten by previous step.
4. [Purge CDN endpoint](https://docs.microsoft.com/en-us/azure/cdn/cdn-purge-endpoint).

# Configuration
This pipeline has separate configuration for `dev` and `prod` environments.,
There is further documentation about the configuration in [config subfolder](./config).

# Blue-Green Deployment In Production
TODO.