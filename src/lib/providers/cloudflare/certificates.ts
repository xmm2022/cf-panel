import type { CertificatesCapability } from "../capabilities/certificates";
import type { Certificate, ProviderCredentials } from "../types";
import { callCloudflare } from "./_invoke";

interface RawCertificate {
  id: string;
  hosts?: string[];
  expires_on: string;
  status: string;
}

function normalizeCertificate(raw: RawCertificate): Certificate {
  return {
    id: raw.id,
    hosts: raw.hosts ?? [],
    expiresOn: raw.expires_on,
    status: raw.status,
  };
}

export const cloudflareCertificates: CertificatesCapability = {
  async list(creds: ProviderCredentials, zoneId: string) {
    const result = await callCloudflare<RawCertificate[]>(
      "list_certificates",
      creds,
      { zoneId },
    );
    return result.map(normalizeCertificate);
  },
};
