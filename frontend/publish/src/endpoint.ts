import * as semver from "semver";

export const pickSuitableEndpointID = (
  tagInfo: TagInfo,
  idList: ReadonlyArray<string>, // This must be *array*, so that the next id calculation would be consistent.
  allExistingTags: ReadonlyArray<string>,
  currentVersion: string, // Must be pre-validated to be semver!
) => {
  // 1. Construct lookup dictionary, version -> tag info
  const idSet = new Set(idList);
  const tagInfoByVersion = allExistingTags.reduce<
    Record<string, { id: string }>
  >((dict, tagName) => {
    const encoded = tryGetEncodedTagFromTagString(tagInfo, tagName);
    if (encoded && idSet.has(encoded.id)) {
      dict[encoded.version] = {
        id: encoded.id,
      };
    }
    return dict;
  }, {});
  const previousVersions = Object.keys(tagInfoByVersion);
  previousVersions.sort((a, b) => semver.compare(b, a)); // Pass b,a instead of a,b, in order to make order descending
  let id: string | undefined;
  // 2. Only proceed if this version is not already in the published tags
  if (!tagInfoByVersion[currentVersion]) {
    // 3. Get the id used in latest version
    if (previousVersions.length > 0) {
      // We might have versions: [2.0, 1.1, 1.0], and we might be publishing version 1.2 as a security patch after 1.1
      // -> latest previous version is *not* the first element of previousVersions array.
      //    Rather it is first element which is less than current version
      const latestPreviousVersionIndex = previousVersions.findIndex(
        (previous) => semver.compare(previous, currentVersion) < 0,
      );
      if (latestPreviousVersionIndex === 0) {
        // 4. Proceed only if current version is newest - in blue & green deployment, it makes no sense to publish patches to old versions.
        id =
          idList[
            (idList.indexOf(
              tagInfoByVersion[previousVersions[latestPreviousVersionIndex]].id,
            ) +
              1) %
              idList.length
          ];
      }
    } else {
      // First version to publish
      id = idList[0];
    }
  }
  return {
    id,
    previousVersions,
  };
};

export interface TagInfo {
  prefix: string;
  versionSeparator: string;
}

export interface EncodedTagName {
  tagInfo: TagInfo;
  id: string;
  version: string;
}

export const tryGetEncodedTagFromTagString = (
  tagInfo: TagInfo,
  tagName: string,
) => {
  const { prefix, versionSeparator } = tagInfo;
  let encoded: EncodedTagName | undefined;
  if (tagName.startsWith(prefix)) {
    const versionSeparatorIndex = tagName.indexOf(
      versionSeparator,
      prefix.length,
    );
    const id = tagName.substring(prefix.length, versionSeparatorIndex);
    encoded = {
      tagInfo,
      id,
      version: tagName.substring(
        versionSeparatorIndex + versionSeparator.length,
      ),
    };
  }
  return encoded;
};

export const getTagNameFromEncoded = ({
  tagInfo: { prefix, versionSeparator },
  id,
  version,
}: EncodedTagName) => `${prefix}${id}${versionSeparator}${version}`;

export const parseGitTags = (lsRemoteOutput: string) =>
  lsRemoteOutput
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.substr(l.lastIndexOf("\t") + "refs/tags/".length + 1));
