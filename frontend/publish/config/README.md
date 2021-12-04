# Website UI CI/CD Pipeline Configuration
This folder contains the configuration files for [development](config-dev.json) and [production](config-prod.json) environments used by [Website UI CI/CD Pipeline](..).
The pipeline's source code is [src sibling folder](../src/deploy.ts), and the schema of this config file adhers to the [specification of the input](../src/config.ts).

Let's walk through the various sections of the configuration file to get a concrete glance on things done by the pipeline:
- `resourceGroupName` property defines resource group name where the Azure resources related to website will be existing. This <abbr title="Resource Group">RG</abbr> is created by [Azure Bootstrap pipeline](/bootstrap), and managed by [Azure Website Pipeline](/infrastructure/website).
- `organization` property defines the name of the organization, which is common part used in naming the Azure resources.
- `environment` property defines current environment (`dev` or `prod`), and is also a common part used in naming the Azure resources.
- `endpoints` property specifies the part of the name of CDP endpoints provisioned by corresponding env in infrastructure/website pipeline. It can be either string, specifying single endpoint, or an array of strings, specifying multiple endpoints. In case of multiple endpoints, suitable one will be picked by enumerating existing Git tags.
