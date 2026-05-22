import type { CertificatesCapability } from "../capabilities/certificates";
import type { Certificate } from "../types";
import { callEdgeOne } from "./_invoke";

interface RawCertificate {
  CertId: string;
  Hosts?: string[];
  ExpiresOn: string;
  Status: string;
}

interface DescribeHostsCertificateResponse {
  Certificates: RawCertificate[];
  TotalCount: number;
}

function normalizeCertificate(raw: RawCertificate): Certificate {
  return {
    id: raw.CertId,
    hosts: raw.Hosts ?? [],
    expiresOn: raw.ExpiresOn,
    status: raw.Status,
  };
}

export const edgeoneCertificates: CertificatesCapability = {
  async list(creds, zoneId) {
    const result = await callEdgeOne<DescribeHostsCertificateResponse>(
      "DescribeHostsCertificate",
      creds,
      { ZoneId: zoneId, Limit: 1000 },
    );
    return result.Certificates.map(normalizeCertificate);
  },
};
