# Azure DNS Pipeline Configuration
This folder contains the [configuration file](config.json) used by [Azure DNS Pipeline](..).
The pipeline's source code is [this repository](../src/resources.ts), and the schema of this config file adhers to the [specification of the input](../src/input.ts).

Let's walk through the various sections of the configuration file to get a concrete glance on things done by the pipeline:
- `resourceGroupName` property defines the resource group name where the Azure resources will be created.
- `dnsZoneName` property defines the name for the [Azure Public DNS Zone](https://docs.microsoft.com/en-us/azure/dns/dns-zones-records), which is same as domain name.
- `additionalRecords` property is an array of DNS records which are not directly related to the website, but are necessary for domain functionality, each element being one of the following:
    - `A` record,
    - `AAAA` record,
    - `CAA` record,
    - `CNAME` record,
    - `MX` record,
    - `NS` record,
    - `PTR` record,
    - `SOA` record,
    - `SRV` record, or
    - `TXT` record.

For further details on how each record is represented, see the [specification of the input](../src/input.ts).