import type { R2BucketSummary, R2ObjectSummary } from "@/components/index-page/shared/index-page-types";

export interface R2StorageViewProps {
  buckets: R2BucketSummary[];
  selectedBucket: string;
  files: R2ObjectSummary[];
  error: string | null;
  isLoading: boolean;
  isLoadingFiles: boolean;
  isUploading: boolean;
  showS3Config: boolean;
  accountId?: string;
  onSelectBucket: (bucketName: string) => void;
  onShowS3Config: (bucketName?: string) => void;
  onCloseS3Config: () => void;
  onRefreshBuckets: () => void;
  onRefreshFiles: () => void;
  onUploadFile: (file: File) => void;
  onDeleteBucket: (bucketName: string) => void;
  onOpenExamples: () => void;
  onCopy: (text: string) => void;
}
