# Public Release Checklist

这份清单用于确认仓库是否已经适合对外公开。

## 仓库内容

- [ ] `.env.local`、`.dev.vars`、`.wrangler/` 未提交
- [ ] `wrangler.toml` 中不包含真实生产 `database_id`
- [ ] README、文档、页面文案中不再包含私有联系信息和私有域名
- [ ] 已添加 `LICENSE`
- [ ] 已准备 `RELEASE_NOTES.md`

## GitHub 配置

- [ ] 仓库说明、About、Topics 已填写
- [ ] GitHub Pages 已启用
- [ ] Actions Variables 已设置 `VITE_WORKER_API_URL`
- [ ] 如需管理员 UI，已设置 `VITE_ADMIN_EMAILS`

## Cloudflare 配置

- [ ] D1 数据库已创建
- [ ] 已执行 `d1-migration.sql`
- [ ] Worker 已部署
- [ ] 如需跨域限制，已设置 `ALLOWED_ORIGINS`

## 功能验收

- [ ] Pages 首页能打开且静态资源无 404
- [ ] Cloudflare 凭据验证成功
- [ ] 能成功拉取 zones
- [ ] 至少一个写入型功能可用
- [ ] D1 读写功能正常

## 对外说明

- [ ] README 已说明当前安全边界
- [ ] README 已说明当前限制和适用场景
- [ ] 首个版本号和 release notes 已准备好
