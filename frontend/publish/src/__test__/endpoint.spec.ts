import test from "ava";
import * as spec from "../endpoint";

const tagNamePrefix = "website-";
// Like blue-green deployment: https://en.wikipedia.org/wiki/Blue-green_deployment
const idList = ["blue", "green"];

const versionSeparatorString = "-v";

const testNextIDCalculation = test.macro(
  (
    t,
    tagList: ReadonlyArray<string>,
    currentVersion: string,
    expectedIDIndex: number | undefined,
    previousVersions: Array<string>,
  ) => {
    t.deepEqual(
      spec.pickSuitableEndpointID(
        {
          prefix: tagNamePrefix,
          versionSeparator: versionSeparatorString,
        },
        idList,
        tagList,
        currentVersion,
      ),
      {
        id: expectedIDIndex === undefined ? undefined : idList[expectedIDIndex],
        previousVersions,
      },
    );
  },
);

test(
  "First version has first ID",
  testNextIDCalculation,
  [],
  "1.0.0",
  0, // expected: 0 - blue
  [],
);

test(
  "First version has first ID with tags of other prefixes",
  testNextIDCalculation,
  [`something-else${versionSeparatorString}1.0.0`],
  "1.0.0",
  0, // expected: 0 - blue
  [],
);

test(
  "Second version has second ID",
  testNextIDCalculation,
  [`${tagNamePrefix}${idList[0]}${versionSeparatorString}1.0.0`], // 0 - blue
  "1.1.0",
  1, // expected: 1 - green
  ["1.0.0"],
);

test(
  "Third version has first ID again",
  testNextIDCalculation,
  [
    `${tagNamePrefix}${idList[0]}${versionSeparatorString}1.0.0`, // 0 - blue
    `${tagNamePrefix}${idList[1]}${versionSeparatorString}1.1.0`, // 1 - green
  ],
  "2.0.0",
  0, // expected: 0 - blue,
  ["1.1.0", "1.0.0"],
);

test(
  "ID deduction works even when there is ID not present in list in the tags",
  testNextIDCalculation,
  [
    `${tagNamePrefix}${idList[0]}${versionSeparatorString}1.0.0`, // 0 - blue
    `${tagNamePrefix}${idList[1]}${versionSeparatorString}1.1.0`, // 1 - green
    `${tagNamePrefix}purple${versionSeparatorString}1.2.0`, // ???
  ],
  "2.0.0",
  0, // expected: 0 - blue
  ["1.1.0", "1.0.0"],
);

test(
  "Trying to publish something other than version after newest will not give ID",
  testNextIDCalculation,
  [
    `${tagNamePrefix}${idList[0]}${versionSeparatorString}1.0.0`, // 0 - blue
  ],
  "0.1.0",
  undefined, // expected: no id
  ["1.0.0"],
);

test(
  "Trying to publish something other than version after newest, with multiple versions, will not give ID",
  testNextIDCalculation,
  [
    `${tagNamePrefix}${idList[0]}${versionSeparatorString}1.0.0`, // 0 - blue
    `${tagNamePrefix}${idList[1]}${versionSeparatorString}2.0.0`, // 1 - green
  ],
  "1.1.0",
  undefined, // expected: no id
  ["2.0.0", "1.0.0"],
);

const testParseGitTags = test.macro(
  (t, lsRemoteOutput: string, expectedTags: ReadonlyArray<string>) => {
    t.deepEqual<ReadonlyArray<string>, ReadonlyArray<string>>(
      spec.parseGitTags(lsRemoteOutput),
      expectedTags,
    );
  },
);

test(
  "When no lines with data, no tags are parsed",
  testParseGitTags,
  "\n\n",
  [],
);

test(
  "When some git ls-remote data, tags are correctly parsed",
  testParseGitTags,
  `a0e5f8e6b7e94b04d99d6142b67c0abc741fb54a\trefs/tags/infra-dev-v1.0.0
e37933266fe2fa1e51779386d0cc3a79fcd7eba4\trefs/tags/infra-dev-v1.1.0
35cf9d3edd9867766c6932db6c287bd4a871bd26\trefs/tags/infra-dev-v1.2.0
83d9007e138ed5da7cb1308f9a20d6bfd6cbb337\trefs/tags/infra-dns-v1.0.0
56cfc19478ea0fa71093828388319f83514a1a12\trefs/tags/infra-dns-v1.0.1
f83ddcf8841215ba9d83ae7d03a2d638103d7b14\trefs/tags/infra-dns-v1.1.0
6aeac00d8426892f0c264db424c33795edae5194\trefs/tags/infra-dns-v1.1.1
`,
  [
    "infra-dev-v1.0.0",
    "infra-dev-v1.1.0",
    "infra-dev-v1.2.0",
    "infra-dns-v1.0.0",
    "infra-dns-v1.0.1",
    "infra-dns-v1.1.0",
    "infra-dns-v1.1.1",
  ],
);
