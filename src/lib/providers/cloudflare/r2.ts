import type { R2Bucket, R2Capability } from "../capabilities/r2";
import type { ProviderCredentials } from "../types";
import { callCloudflare } from "./_invoke";

interface RawR2Bucket {
  name: string;
  creation_date: string;
}

type RawR2List = RawR2Bucket[] | { buckets?: RawR2Bucket[] };

function normalizeBucket(raw: RawR2Bucket): R2Bucket {
  return {
    name: raw.name,
    creationDate: raw.creation_date,
  };
}

function unwrapBuckets(result: RawR2List): RawR2Bucket[] {
  return Array.isArray(result) ? result : (result.buckets ?? []);
}

export const cloudflareR2: R2Capability = {
  async listBuckets(creds: ProviderCredentials) {
    const result = await callCloudflare<RawR2List>("list_r2_buckets", creds);
    return unwrapBuckets(result).map(normalizeBucket);
  },
};
