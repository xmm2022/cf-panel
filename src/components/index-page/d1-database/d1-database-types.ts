import type { D1DatabaseSummary, D1QueryResult } from "@/components/index-page/shared/index-page-types";

export interface D1DatabaseViewProps {
  databases: D1DatabaseSummary[];
  selectedDatabase: string;
  sqlQuery: string;
  queryHistory: string[];
  historyIndex: number;
  queryResult: D1QueryResult | null;
  isLoading: boolean;
  isExecutingQuery: boolean;
  canCreate: boolean;
  onSelectDatabase: (databaseId: string) => void;
  onSqlQueryChange: (query: string) => void;
  onHistoryIndexChange: (index: number) => void;
  onRunQuery: () => void;
  onRefresh: () => void;
  onOpenCreateDialog: () => void;
  onDeleteDatabase: (databaseId: string) => void;
}
