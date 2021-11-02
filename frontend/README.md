# Website UI Source Code and CI/CD
The necessary source code and <abbr title="Continuous Integration">CI</abbr>/<abbr title="Continuous Delivery">CD</abbr> for website as part of [Github flow](https://guides.github.com/introduction/flow/) consists of two components, described below.
Each component is explained in greater technical detail in its dedicated subfolder.
Both the source code for UI and the pipelines are written in [TypeScript](https://www.typescriptlang.org/).

## Website UI Source Code
The website UI is written with TypeScript utilizing [React](https://reactjs.org/) library.
The UI is a static website without any backend functionality.
The [MaterialUI library](https://mui.com/) is used to keep the code compact.
See [dedicated subfolder](./code) for more details.

## Website UI CI/CD
The [CI pipeline for the website UI](https://github.com/CodeWell-fi/website/actions/workflows/website-ci.yml) first builds the UI using [Create React App](https://create-react-app.dev/) `build` command.
The various `.html`, `.js`, and other files produced by the build process are then stored as CI pipeline artifacts.

The CD pipelines for the website UI [development](https://github.com/CodeWell-fi/website/actions/workflows/website-cd-dev.yml) and production environments will then use the artifacts of the CI pipeline to upload them to Azure Storage account, and then [purge Azure CDN](https://docs.microsoft.com/en-us/azure/cdn/cdn-purge-endpoint).
The [CD pipeline source code](./publish) is a TypeScript application utilizing various native `@azure/xyz` NPM libraries to perform these tasks.
