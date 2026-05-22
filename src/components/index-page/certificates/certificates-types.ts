import type { Certificate } from "@/lib/providers/types";

export interface CertificatesViewProps {
  certificates: Certificate[];
  isLoading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  selectedZoneName?: string;
}
