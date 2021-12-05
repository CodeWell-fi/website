export interface TagInfo {
  prefix: string;
  versionSeparator: string;
}

export interface EncodedTagName {
  tagInfo: TagInfo;
  id: string;
  version: string;
}
