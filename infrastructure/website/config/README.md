# Azure Website Pipeline Configuration
This folder contains the configuration files for [development](config-dev.json) and [production](config-prod.json) environments used by [Azure Website Pipeline](..).
The pipeline's source code is [src sibling folder](../src/resources.ts), and the schema of this config file adhers to the [specification of the input](../src/input.ts).

Let's walk through the various sections of the configuration file to get a concrete glance on things done by the pipeline:
- `resourceGroupName` property defines resource group name where the Azure resources will be created (this <abbr title="Resource Group">RG</abbr> is created by [Azure Bootstrap pipeline](../../bootstrap)).
- `organization` property defines the name of the organization, which is common part used in naming the resources.
- `environment` property defines current environment (`dev` or `prod`), and is also a common part used in naming the resources.
- `domainNames` property is one of the following:
    - an array with objects of following schema:
        - `zone` property defining the [Public DNS Zone](https://docs.microsoft.com/en-us/azure/dns/dns-zones-records) via object with `resourceGroupName` and `zoneName` properties. This zone is created by [Azure DNS Pipeline](../..dns).
        - `relativeName` property defining the [relative name](https://docs.microsoft.com/en-us/azure/dns/dns-zones-records#record-names) of `CNAME` record that will be added for [Azure CDN Endpoint](https://docs.microsoft.com/en-us/azure/cdn/cdn-create-new-endpoint) created for this entry.
    - an object with the following properties:
        - `defaultZone` property of same schema as `zone` property above, and
        - `domains` property of same schema as `domainNames` property above, with addition of each array element being just a `string` which is interpreted as `relativeName`.
