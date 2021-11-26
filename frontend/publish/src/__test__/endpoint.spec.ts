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
  ) => {
    t.deepEqual(
      spec.pickSuitableEndpointID(
        idList,
        tagNamePrefix,
        tagList,
        currentVersion,
        versionSeparatorString,
      ),
      expectedIDIndex === undefined ? undefined : idList[expectedIDIndex],
    );
  },
);

test(
  "First version has first ID",
  testNextIDCalculation,
  [],
  "1.0.0",
  0, // expected: 0 - blue
);

test(
  "First version has first ID with tags of other prefixes",
  testNextIDCalculation,
  ["something-else${versionSeparatorString}1.0.0"],
  "1.0.0",
  0, // expected: 0 - blue
);

test(
  "Second version has second ID",
  testNextIDCalculation,
  [`${tagNamePrefix}${idList[0]}${versionSeparatorString}1.0.0`], // 0 - blue
  "1.1.0",
  1, // expected: 1 - green
);

test(
  "Third version has first ID again",
  testNextIDCalculation,
  [
    `${tagNamePrefix}${idList[0]}${versionSeparatorString}1.0.0`, // 0 - blue
    `${tagNamePrefix}${idList[1]}${versionSeparatorString}1.1.0`, // 1 - green
  ],
  "2.0.0",
  0, // expected: 0 - blue
);

test(
  "ID deduction works even when there is ID not present in list in the tags",
  testNextIDCalculation,
  [
    `${tagNamePrefix}${idList[0]}${versionSeparatorString}1.0.0`, // 0 - blue
    `${tagNamePrefix}${idList[1]}${versionSeparatorString}1.1.0`, // 1 - green
    `${tagNamePrefix}purple${versionSeparatorString}1.1.0`, // ???
  ],
  "2.0.0",
  0, // expected: 0 - blue
);

test(
  "Trying to publish something other than version after newest will not give ID",
  testNextIDCalculation,
  [
    `${tagNamePrefix}${idList[0]}${versionSeparatorString}1.0.0`, // 0 - blue
  ],
  "0.1.0",
  undefined, // expected: no id
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
);
