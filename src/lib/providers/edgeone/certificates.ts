import type { CertificatesCapability } from "../capabilities/certificates";
import type { Certificate } from "../types";
import { callEdgeOne } from "./_invoke";

interface RawCertificate {
  CertId: string;
  CommonName?: string;
  SubjectAltName?: string[];
  ExpireTime?: string;
  Status?: string;
}

interface DescribeDefaultCertificatesResponse {
  DefaultServerCertInfo?: RawCertificate[];
  TotalCount?: number;
}

function normalizeCertificate(raw: RawCertificate): Certificate {
  const hosts = [raw.CommonName, ...(raw.SubjectAltName ?? [])].filter(
    (host): host is string => Boolean(host),
  );

  return {
    id: raw.CertId,
    hosts: [...new Set(hosts)],
    expiresOn: raw.ExpireTime ?? "",
    status: raw.Status ?? "",
  };
}

export const edgeoneCertificates: CertificatesCapability = {
  async list(creds, zoneId) {
    const result = await callEdgeOne<DescribeDefaultCertificatesResponse>(
      "DescribeDefaultCertificates",
      creds,
      { ZoneId: zoneId, Offset: 0, Limit: 100 },
    );
    return (result.DefaultServerCertInfo ?? []).map(normalizeCertificate);
  },
};
