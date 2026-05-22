import type { ReactNode } from "react";
import type { WorkerScript } from "@/lib/providers/types";

export interface WorkerRouteSummary {
  id?: string;
  pattern: string;
  script?: string;
}

export interface WorkerListItem extends WorkerScript {
  createdOn?: string;
  routes?: WorkerRouteSummary[];
}

export interface WorkerBindingSummary {
  type: string;
  name: string;
  id?: string;
  namespace_id?: string;
  database_id?: string;
  realName?: string;
  bucket_name?: string;
}

export interface WorkersViewProps {
  scripts: WorkerListItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (scriptId: string) => void;
  onDelete: (scriptId: string) => void;
  workerSubdomain?: string;
  bindingsByWorkerId?: Record<string, WorkerBindingSummary[]>;
  analyticsPanel?: ReactNode;
  onCopyUrl?: (url: string, type: "workersDev" | "customDomain") => void;
  onBindD1?: (scriptId: string) => void;
  onBindR2?: (scriptId: string) => void;
  onBindKV?: (scriptId: string) => void;
  onManageVariables?: (scriptId: string) => void;
}
