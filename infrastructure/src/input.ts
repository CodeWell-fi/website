import * as t from "io-ts";
import * as validation from "@data-heaving/common-validation";

export const configuration = t.type({
  resourceGroupName: validation.nonEmptyString,
  organization: validation.nonEmptyString,
  environment: validation.nonEmptyString,
  domainNames: t.array(validation.nonEmptyString),
  httpsEnabled: t.boolean,
});

export type Configuration = t.TypeOf<typeof configuration>;
