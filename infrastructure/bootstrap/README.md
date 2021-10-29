# Azure Bootstrap Pipeline
This folder contains configuration for Azure Bootstrap pipeline, the purpose of which is to create necessary infrastructure so that one or more [Pulumi](https://pulumi.com) pipelines can be run later.
Each Pulumi pipeline requires a storage to store its state, and additionally a key within key vault to encrypt secrets in the state.
The pipelines in this repository that are set up by this bootstrap pipeline are [DNS](../dns) and [Website](../website) pipelines.

The pipeline source code is actually in [DataHeaving repository](https://github.com/DataHeaving/pulumi/tree/main/azure-pipeline-bootstrap), so this folder merely contains a configuration for it.
The configuration is explained in more detail in [its dedicated folder](config).

The pipeline itself works by asking to log in [using device code](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-device-code) while it prepares AAD and other things.
This means that after starting the pipeline, there must be a human person following the pipeline output, and performing the login.
For the same reason, the pipeline is marked to only to be started manually.

After the initial AAD and other preparations are done, the pipeline will run Pulumi to manage the resources related to other Pulumi pipelines, and will display the intended changes.
Then, the pipeline will wait for manual approval, before proceeding to perform those changes.

**IMPORTANT**! The pipeline with typical configration requires Administrator access to <abbr title="Azure Active Directory">AAD</abbr>, and Owner access at Azure Subscription level.
Because of this, make sure to read and understand the [source code](https://github.com/DataHeaving/pulumi/tree/main/azure-pipeline-bootstrap) of the pipeline that is being run!
Make sure that it is indeed correct package that is being downloaded and executed.

The [GitHub Workflow file](../../.github/workflows/bootstrap.yml) defines the [GitHub Workflow](actions/workflows/bootstrap.yml) that uses the code in this folder to execute.