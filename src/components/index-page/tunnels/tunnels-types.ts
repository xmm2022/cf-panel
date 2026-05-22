import type { TunnelSummary } from "@/components/index-page/shared/index-page-types";

export interface TunnelsViewProps {
  tunnels: TunnelSummary[];
  isLoading: boolean;
  canManage?: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (tunnelId: string) => void;
  onConfig: (tunnelId: string) => void;
  onRoute: (tunnelId: string) => void;
  onDelete?: (tunnelId: string) => void;
}
