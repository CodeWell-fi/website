import * as semver from "semver";

export const pickSuitableEndpointID = (
  idList: ReadonlyArray<string>, // This must be *array*, so that the next id calculation would be consistent.
  tagNamePrefix: string,
  allExistingTags: ReadonlyArray<string>,
  currentVersion: string, // Must be pre-validated to be semver!
  versionSeparatorString = "-v",
) => {
  // 1. Construct lookup dictionary, version -> tag info
  const idSet = new Set(idList);
  const tagInfoByVersion = allExistingTags.reduce<
    Record<string, { id: string }>
  >((dict, tagName) => {
    if (tagName.startsWith(tagNamePrefix)) {
      const versionSeparatorIndex = tagName.indexOf(
        versionSeparatorString,
        tagNamePrefix.length,
      );
      const idInTag = tagName.substring(
        tagNamePrefix.length,
        versionSeparatorIndex,
      );
      if (idSet.has(idInTag)) {
        dict[
          tagName.substring(
            versionSeparatorIndex + versionSeparatorString.length,
          )
        ] = {
          id: idInTag,
        };
      } // else - warning... ?
    }
    return dict;
  }, {});
  let currentID: string | undefined;
  // 2. Only proceed if this version is not already in the published tags
  if (!tagInfoByVersion[currentVersion]) {
    // 3. Get the id used in latest version
    const previousVersions = Object.keys(tagInfoByVersion);
    if (previousVersions.length > 0) {
      previousVersions.sort((a, b) => semver.compare(b, a)); // Pass b,a instead of a,b, in order to make order descending
      // We might have versions: [2.0, 1.1, 1.0], and we might be publishing version 1.2 as a security patch after 1.1
      // -> latest previous version is *not* the first element of previousVersions array.
      //    Rather it is first element which is less than current version
      const latestPreviousVersion = previousVersions.find(
        (previous) => semver.compare(previous, currentVersion) < 0,
      );
      if (latestPreviousVersion) {
        // 4. Current ID is next ID in list after ID encoded in previous version tag name.
        // If next index in list is bigger than list length, it will be rotated back to 0 with modulus operator.
        currentID =
          idList[
            (idList.indexOf(tagInfoByVersion[latestPreviousVersion].id) + 1) %
              idList.length
          ];
      }
    } else {
      // First version to publish
      currentID = idList[0];
    }
  }
  return currentID;
};
