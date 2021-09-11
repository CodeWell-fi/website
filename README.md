# Code Well Website
This repository contains setup for website hosted by company Code Well.

# Contents
## Bootstrap
Initial setup for everything else in this repository was initially done by manually running [bootstrap pipeline](.github/workflows/bootstrap.yml).

## Infrastructure
The infrastructure pipelines for [development](.github/workflows/infrastructure-dev.yml) and production environments utilize Pulumi to run Azure resources for hosting a website.
Pulumi pipeline uses resources set up by bootstrap pipeline to store its backend config and state in Azure.
The source code for infrastructure pipeline is in [infrastructure folder](infrastructure).

## Website
The actual website is a React application.
