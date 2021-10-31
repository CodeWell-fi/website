# Azure Bootstrap Pipeline Configuration
This folder contains the [configuration file](config.json) used by [Azure Bootstrap Pipeline](..).
The pipeline's source code is in [DataHeaving repository](https://github.com/DataHeaving/pulumi/tree/main/azure-pipeline-bootstrap), and the schema of this config file adhers to the [specification in the pipeline source code](https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline-bootstrap/src/cli-config.ts#L113).

Let's walk through the various sections of the configuration file to get a concrete glance on things done by the pipeline:
- `bootstrapperApp` property describes the identity which will run the actual set up for other Pulumi pipelines
    - `type` property with `sp` value signals that bootstrapper identity should be [service principal](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals). Another possibility for this property is `msi`, signalling that bootstrapper identity should be [user-assigned managed identity](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview).
    - `displayName` property defines the service principal display name.
    - `authentication` object contains properties related to authentication of service principal:
        - `certSubject` is a string to give to [openssl certificate generation command](https://www.digicert.com/kb/ssl-support/openssl-quick-reference-guide.htm#Usingthe-subjSwitch). Service principal will use certificate, and not the password, for authentication.
        - Other properties [are also available](https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline-bootstrap/src/cli-config.ts#L144), but are optional.
    - `envSpecificPulumiPipelineSPAuth` object contains properties related to service principal -based authentication of other Pulumi pipelines:
        - `subject` is similar to `certSubject` property above, except now it is not a string, but an object with same fields as [Terraform TLS certificate block](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/cert_request),
        - Other properties [are also available](https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline-bootstrap/src/cli-config.ts#L183), but are optional.
    - Other properties [are also available](https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline-bootstrap/src/cli-config.ts#L191), but are optional.
- `azure` property describes the Azure environment where this and other Pulumi pipelines will operate:
    - `tenantId` is the [tenant ID of the Azure AD](https://docs.microsoft.com/en-us/onedrive/find-your-office-365-tenant-id).
    - `subscriptionId` is the [subscription ID of the current subscription](https://docs.microsoft.com/en-us/azure/media-services/latest/setup-azure-subscription-how-to?tabs=portal#use-the-azure-portal).
- `organization` property describes some common aspects of other Pulumi pipelines:
    - `name` property defines organization name and will be used as common element within names of all resources managed by bootstrap pipeline.
    - `location` property defines Azure region where the resources like storage accounts and key vault will be created.
    - `environments` property defines information about other Pulumi pipelines as an array where each element describes one Pulumi pipeline:
        - simple string as environment name and bootstrap pipeline taking care of the rest, or
        - object with the following properties:
            - `name` as mandatory property defining environment name,
            - `envSpecificSPAuthOverride` as optional property, in order to define the [API permissions for Pulumi pipeline service principal](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent) via `applicationRequiredResourceAccess` property.
            - `providerRegistrations` as optional property, as an array with [Azure provider registrations](https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/resource-providers-and-types).
            - Other properties [are also available](https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline-bootstrap/src/cli-config.ts#L55), but are optional.
- `targetResources` property describes how bootstrap pipeline should adjust the Azure resources it creates:
    - `cicdRGSuffix` property defines the name suffix for <abbr title="Resource Group">RG</abbr> where Pulumi CI/CD resources (storage account, key vault) reside.
    - `targetRGSuffix` optional property defines the suffix for RG where resources managed by other Pulumi pipelines will reside. If present, then RG will be created with given suffix and Pulumi pipeline identity will be assigned as `Owner` of that RG. If empty string, then `cicdRGSuffix` will be used.
    - Other properties [are also available](https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline-bootstrap/src/cli-config.ts#L215), but are optional.
- Other properties [are also available](https://github.com/DataHeaving/pulumi/blob/main/azure-pipeline-bootstrap/src/cli-config.ts#L227), but are optional.

The `applicationRequiredResourceAccess` of the [DNS pipeline](../../dns) describes `Application.Read.All` [Microsoft Graph Permission](https://docs.microsoft.com/en-us/graph/permissions-reference#application-permissions-4) so that DNS pipeline could assign necessary permissions for [Website pipeline](../../website) service principal (`dev` and `prod`).
The DNS pipeline needs to do this because initial permissions assigned by bootstrap pipeline for Pulumi pipeline identities only have `Owner` role for their respective RGs, and only them.
Furthermore, we don't want to hard-code Website pipeline service principal IDs into some variables, but instead do the lookup based on display name.