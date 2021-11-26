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
      const latestPreviousVersionIndex = previousVersions.findIndex(
        (previous) => semver.compare(previous, currentVersion) < 0,
      );
      if (latestPreviousVersionIndex === 0) {
        // 4. Proceed only if current version is newest - in blue & green deployment, it makes no sense to publish patches to old versions.
        currentID =
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
      currentID = idList[0];
    }
  }
  return currentID;
};
