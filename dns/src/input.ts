import * as t from "io-ts";
import * as validation from "@data-heaving/common-validation";

export const RecordType = {
  A: "A",
  AAAA: "AAAA",
  CAA: "CAA",
  CNAME: "CNAME",
  MX: "MX",
  // NAPTR: "NAPTR",
  NS: "NS",
  PTR: "PTR",
  SOA: "SOA",
  // SPF: "SPF",
  SRV: "SRV",
  TXT: "TXT",
} as const;
export declare type RecordType = typeof RecordType[keyof typeof RecordType];
const createRecordType = <P extends t.Props, TRecordType extends RecordType>(
  recordType: TRecordType,
  props: P,
) =>
  t.type(
    {
      type: t.literal(recordType),
      relativeName: validation.nonEmptyString,
      ttl: t.Integer,
      ...props,
    },
    `Record${recordType}`,
  );
export const configuration = t.type(
  {
    resourceGroupName: validation.nonEmptyString,
    dnsZoneName: validation.nonEmptyString,
    additionalRecords: t.array(
      t.union(
        [
          createRecordType(RecordType.A, {
            address: validation.nonEmptyString,
          }),
          createRecordType(RecordType.AAAA, {
            address: validation.nonEmptyString,
          }),
          createRecordType(RecordType.CAA, {
            flags: t.Integer,
            tag: t.string,
            value: t.string,
          }),
          createRecordType(RecordType.CNAME, {
            cname: t.string,
          }),
          createRecordType(RecordType.MX, {
            exchange: t.string,
            preference: t.Integer,
          }),
          createRecordType(RecordType.NS, {
            nsdname: t.string,
          }),
          createRecordType(RecordType.PTR, {
            ptrdname: t.string,
          }),
          createRecordType(RecordType.SOA, {
            email: t.string,
            expireTime: t.Integer,
            host: t.string,
            minimumTTL: t.Integer,
            refereshTime: t.Integer,
            retryTime: t.Integer,
            serialNumber: t.Integer,
          }),
          createRecordType(RecordType.SRV, {
            port: t.Integer,
            priority: t.Integer,
            target: t.string,
            weight: t.Integer,
          }),
          createRecordType(RecordType.TXT, {
            value: t.array(t.string),
          }),
        ],
        "AdditionalRecord",
      ),
      "AdditionalRecordList",
    ),
    dnsZoneContributorSPNames: t.array(validation.nonEmptyString),
  },
  "DNSPipelineConfig",
);

export type Configuration = t.TypeOf<typeof configuration>;
