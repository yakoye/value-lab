# Value Lab

一个用于比较贵重物品持有成本、当前二手价格、购买价值和生活平替方案的静态网页。

## v0.4.0 已实现

- 一级导航：成本、市场、购买参考、生活平替、我的。
- iPhone 与 MacBook Pro 成本分析。
- iPhone 容量联动，缺失容量价格使用明确的容量残值换算。
- 1–5 年价值趋势。
- 每年下降金额、环比下降率、累计下降金额、累计下降率和残值率。
- 产品机龄 / 我的持有时间两种趋势口径。
- 新品、二手买入、个人转卖、平台回收分开记录。
- 108 条经过初步去重和安全筛选的生活平替。
- 18 个平替分类。
- 平替搜索、分类、可靠性、风险、证据和类型筛选。
- 平替收藏。
- 我的物品、本地估值和累计价值下降。
- 全局搜索。
- 深色主题。
- JSON / CSV 导出。
- 桌面端和移动端独立布局。

## 部署到 GitHub Pages

1. 将本目录中的全部文件上传到 GitHub 仓库根目录。
2. 打开 `Settings → Pages`。
3. 在 `Build and deployment` 中选择 `Deploy from a branch`。
4. 选择 `main` 分支和 `/ (root)`。
5. 保存并等待 GitHub Pages 完成部署。

## 本地预览

```bash
python -m http.server 8080
```

然后打开：

```text
http://localhost:8080
```

不要直接双击 `index.html`，部分浏览器会阻止读取 JSON 数据文件。

## 数据目录

```text
data/
├─ models.json                  # iPhone 参数
├─ market.json                  # iPhone 市场价格
├─ macbook_models.json          # MacBook Pro 参数
├─ macbook_market.json          # MacBook Pro 市场价格
├─ alternatives.json            # 可公开展示的生活平替
├─ alternatives_rejected.json   # 被隔离的高风险示例与原因
├─ categories.json              # 生活平替分类
├─ sources.json                 # 产品和价格资料来源
├─ strategies.json              # 换机策略
└─ site.json                    # 版本与模块信息
```

## 本地数据

“我的物品”、平替收藏、主题和筛选条件保存在浏览器 LocalStorage 中，不上传服务器。清除浏览器网站数据会删除这些记录，请定期导出 JSON。

## 数据原则

- 新品、二手买入、个人转卖和平台回收不能混为一个价格。
- 价格必须尽量记录日期、平台、配置、容量、机况和可信度。
- 价值趋势属于参考估值，不是未来成交承诺。
- 生活平替必须分别评价功能可靠性、安全等级和证据等级。
- 高风险健康、婴幼儿、宠物用药、电器改装、火源和关键承重方案不进入普通列表。

## 项目文档

- [网站结构](docs/SITE_MAP.md)
- [开发计划](docs/DEVELOPMENT_PLAN.md)
- [数据模型](docs/DATA_MODEL.md)
- [生活平替审核说明](docs/ALTERNATIVES_REVIEW.md)
- [测试记录](docs/TEST_REPORT.md)
