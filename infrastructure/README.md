# Infrastructure for Website
The necessary infrastructure to easily handle the website setup as part of [Github flow](https://guides.github.com/introduction/flow/) consists of three components, described below.
Each component is explained in greater technical detail in its dedicated subfolder.
All of the pipelines below are written in [TypeScript](https://www.typescriptlang.org/) and utilize [Pulumi](https://www.pulumi.com/) in handling the cloud infrastructure management.

## Bootstrapping Azure subscription
A golden standard of DevOps is to not do e.g. infrastructure things manually, and this is why [<abbr title="Infrastructure as a Code">IaC</abbr>](https://en.wikipedia.org/wiki/Infrastructure_as_code) was developed.
Current IaC cloud infra frameworks like Terraform and Pulumi still do require some manual setup done to the cloud environment before they can be operable within e.g. CI/CD environment.
More specifically, both require cloud-hosted storage to store their state, and Pulumi also additionally requires encryption key since it stores secrets within state as encrypted strings.
The pipeline in [bootstrap folder](bootstrap) takes care of doing those necessary steps, as well as creating [service principal](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals) for Pulumi pipeline to execute.

## DNS configuration
Azure currently does not offer ways to register domain name [without creating app service](https://docs.microsoft.com/en-us/azure/app-service/manage-custom-dns-buy-domain).
The static website does not require app service, therefore **manual action related for this step is to buy your domain name**.
The pipeline in [dns folder](dns) will manage the Azure DNS configuration, which operates on level of [public DNS zone](https://docs.microsoft.com/en-us/azure/dns/dns-overview), and does not require app service.
The pipeline can be run independently from domain registration step.
Once domain registration is complete, and the pipeline has created public DNS zone, [the domain provider's nameserver configration for your domain must be directed to be used Azure DNS zone nameservers](https://docs.microsoft.com/en-us/azure/dns/dns-delegate-domain-azure-dns).

## Website resources
After DNS setup is complete, the storage setup used to serve website files can be utilized.
The pipeline in [website folder](website) will manage [Azure storage account](https://docs.microsoft.com/en-us/azure/storage/common/storage-account-overview) and its [static website functionality](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website) to create cloud resource where to store website files.
Furthermore, the [Azure CDN](https://docs.microsoft.com/en-us/azure/cdn/) instance is created with [custom DNS endpoint](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-custom-domain-name) in order for the website files in the storage account to be accessible through the custom domain name.
HTTPS support is also handled by this pipeline.