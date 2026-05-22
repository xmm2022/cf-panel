import type { PagesCapability, PagesProject } from "../capabilities/pages";
import type { ProviderCredentials } from "../types";
import { callCloudflare } from "./_invoke";

interface RawPagesProject {
  id?: string;
  name: string;
  subdomain?: string;
  created_on: string;
}

function normalizePagesProject(raw: RawPagesProject): PagesProject {
  return {
    id: raw.id ?? raw.name,
    name: raw.name,
    subdomain: raw.subdomain,
    createdOn: raw.created_on,
    raw,
  };
}

export const cloudflarePages: PagesCapability = {
  async list(creds: ProviderCredentials) {
    const result = await callCloudflare<RawPagesProject[]>(
      "list_pages_projects",
      creds,
    );
    return result.map(normalizePagesProject);
  },
};
