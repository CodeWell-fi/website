# Source Code for Code Well Public Website
This repository contains infrastructure and content setup for website hosted by company Code Well.
# Repository structure
## Infrastructure
The website is hosted as files in [Azure static website storage account](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website).
All related DevOps pipeline source code, starting from bootstrapping blank Azure subscription, and ending with [Public DNS Zone](https://docs.microsoft.com/en-us/azure/dns/dns-zones-records) and [Azure CDN setup with custom domain](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-custom-domain-name) are in [infrastructure folder of this repository](infrastructure).

## Website
The website itself is written in [TypeScript](https://www.typescriptlang.org/) utilizing [React](https://reactjs.org/) framework.
The related source code, including website contents as well as deployment DevOps pipeline source code, are in [frontend folder of this repository](frontend).

## DevOps pipelines
The GitHub-compatible DevOps pipeline definitions are in [.github/workflows folder](.github/workflows).
These definitions are small wrappers around calling TypeScript code, which performs the actual functionality of the pipeline.

The code in [infrastructure folder](infrastructure) utilizes [Pulumi](https://www.pulumi.com/) framework to handle Azure infrastructure management.
The code in [frontend folder](frontend) utilizes [Create React App](https://create-react-app.dev/) build command to produce `.html`, `.js`, and other files, and then normal Node Azure libraries to upload website files to storage account and [purge Azure CDN](https://docs.microsoft.com/en-us/azure/cdn/cdn-purge-endpoint).

The non-production environment pipelines, both infrastructure and website, trigger automatically whenever PR is merged to `main` branch.
This means that whenever PR containing changes to [frontend source code folder](./frontend/code) is merged to `main` branch, the development environment pipeline will trigger automatically and the change is visible live at [CodeWell Dev Website](https://dev.codewell.fi) after pipelines complete their run.
Production environment, and other pipelines, trigger manually via GitHub [`workflow_dispatch` event](https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#workflow_dispatch).