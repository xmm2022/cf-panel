import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Database, Loader2, Trash2 } from "lucide-react";
import type { D1DatabaseViewProps } from "./d1-database-types";

const queryShortcuts = [
  { label: "查看表", sql: "SELECT * FROM sqlite_master WHERE type='table';" },
  { label: "统计记录", prompt: "请输入表名:", build: (tableName: string) => `SELECT COUNT(*) as total FROM ${tableName};` },
  { label: "插入数据", prompt: "请输入表名:", build: (tableName: string) => `INSERT INTO ${tableName} (column1, column2) VALUES ('value1', 'value2');` },
  { label: "更新数据", prompt: "请输入表名:", build: (tableName: string) => `UPDATE ${tableName} SET column1 = 'new_value' WHERE id = 1;` },
  { label: "删除数据", prompt: "请输入表名:", build: (tableName: string) => `DELETE FROM ${tableName} WHERE id = 1;` },
  {
    label: "创建表",
    prompt: "请输入表名:",
    build: (tableName: string) =>
      `CREATE TABLE ${tableName} (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`,
  },
];

export function D1DatabaseView({
  databases,
  selectedDatabase,
  sqlQuery,
  queryHistory,
  historyIndex,
  queryResult,
  isLoading,
  isExecutingQuery,
  canCreate,
  onSelectDatabase,
  onSqlQueryChange,
  onHistoryIndexChange,
  onRunQuery,
  onRefresh,
  onOpenCreateDialog,
  onDeleteDatabase,
}: D1DatabaseViewProps) {
  const handleHistoryKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (queryHistory.length > 0) {
        const nextIndex = historyIndex < queryHistory.length - 1 ? historyIndex + 1 : historyIndex;
        onHistoryIndexChange(nextIndex);
        onSqlQueryChange(queryHistory[nextIndex]);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        onHistoryIndexChange(nextIndex);
        onSqlQueryChange(queryHistory[nextIndex]);
      } else if (historyIndex === 0) {
        onHistoryIndexChange(-1);
        onSqlQueryChange("");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>D1 SQL 数据库</CardTitle>
            <CardDescription>管理您的 Cloudflare D1 数据库实例</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              刷新
            </Button>
            <Button onClick={onOpenCreateDialog} disabled={isLoading || !canCreate}>
              <Database className="w-4 h-4 mr-2" />
              创建数据库
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {databases.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无 D1 数据库</p>
              <p className="text-xs text-muted-foreground mt-2">请前往 Cloudflare 控制台创建 D1 数据库</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {databases.map((database) => (
                <div
                  key={database.uuid}
                  className="p-2 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <h3 className="font-medium truncate">{database.name}</h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(database.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="truncate">UUID: {database.uuid}</span>
                        <span className="whitespace-nowrap">版本: {database.version || "N/A"}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteDatabase(database.uuid)}
                      disabled={isLoading}
                      aria-label={`删除 ${database.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {databases.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              SQL 控制台
            </CardTitle>
            <CardDescription>在选定的数据库中执行 SQL 查询</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="d1-select">选择数据库</Label>
              <select
                id="d1-select"
                className="w-full mt-1.5 px-3 py-2 border border-border rounded-md bg-background"
                value={selectedDatabase}
                onChange={(event) => onSelectDatabase(event.target.value)}
              >
                <option value="">-- 选择数据库 --</option>
                {databases.map((database) => (
                  <option key={database.uuid} value={database.uuid}>
                    {database.name} ({database.uuid})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2">
                <Label htmlFor="d1-sql">SQL 查询</Label>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">查询:</span>
                  {queryShortcuts.slice(0, 2).map((shortcut) => (
                    <Button
                      key={shortcut.label}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        if ("sql" in shortcut) {
                          onSqlQueryChange(shortcut.sql);
                          return;
                        }
                        const tableName = window.prompt(shortcut.prompt);
                        if (tableName) onSqlQueryChange(shortcut.build(tableName));
                      }}
                    >
                      {shortcut.label}
                    </Button>
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">操作:</span>
                  {queryShortcuts.slice(2).map((shortcut) => (
                    <Button
                      key={shortcut.label}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const tableName = window.prompt(shortcut.prompt);
                        if (tableName) onSqlQueryChange(shortcut.build(tableName));
                      }}
                    >
                      {shortcut.label}
                    </Button>
                  ))}
                </div>
              </div>
              <textarea
                id="d1-sql"
                className="w-full mt-1.5 px-3 py-2 border border-border rounded-md bg-background font-mono text-sm min-h-[80px]"
                value={sqlQuery}
                onChange={(event) => {
                  onSqlQueryChange(event.target.value);
                  onHistoryIndexChange(-1);
                }}
                onKeyDown={handleHistoryKey}
                placeholder="SELECT * FROM table_name LIMIT 10;"
              />
              {queryHistory.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  提示: 使用 ↑↓ 方向键浏览历史命令 ({queryHistory.length} 条)
                </p>
              )}
            </div>

            <Button
              onClick={onRunQuery}
              disabled={isExecutingQuery || !selectedDatabase || !sqlQuery.trim()}
              className="w-full"
            >
              {isExecutingQuery ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  执行中...
                </>
              ) : (
                "执行查询"
              )}
            </Button>

            <div className="border border-border rounded-lg overflow-hidden bg-muted/10" style={{ height: "300px" }}>
              {queryResult ? (
                <>
                  <div className="bg-muted px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium">查询结果 ({queryResult.results?.length || 0} 条记录)</p>
                    {queryResult.meta && (
                      <p className="text-xs text-muted-foreground mt-1">
                        执行时间: {queryResult.meta.duration}ms | 影响行数: {queryResult.meta.changes || 0}
                      </p>
                    )}
                  </div>

                  {queryResult.results && queryResult.results.length > 0 ? (
                    <div className="overflow-auto" style={{ height: "calc(300px - 52px)" }}>
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            {Object.keys(queryResult.results[0]).map((column) => (
                              <th key={column} className="px-4 py-2 text-left font-medium border-b border-border">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.results.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-muted/30 transition-colors">
                              {Object.values(row).map((value, columnIndex) => (
                                <td key={columnIndex} className="px-4 py-2 border-b border-border/50">
                                  {value === null ? (
                                    <span className="text-muted-foreground italic">null</span>
                                  ) : typeof value === "object" ? (
                                    <code className="text-xs">{JSON.stringify(value)}</code>
                                  ) : (
                                    String(value)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-muted-foreground">查询执行成功，但没有返回结果</div>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">查询结果将在此处显示</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
