FROM pulumi/pulumi-nodejs:3.12.0-debian as pulumi

FROM node:16-buster-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && npm config set update-notifier false

COPY --from=pulumi /pulumi/bin/pulumi /pulumi/bin/pulumi
COPY --from=pulumi /pulumi/bin/*-nodejs* /pulumi/bin/
COPY --from=pulumi /pulumi/bin/pulumi-analyzer-policy /pulumi/bin/
ENV PATH "/pulumi/bin:${PATH}"