# Value Lab

一个用于比较贵重物品持有成本、当前市场价格、购买价值和生活平替方案的静态网页。

## v0.6.1 已实现


### 页面逻辑顺序

所有核心页面统一遵循：

```text
先选择对象和配置
→ 再展示价格或候选列表
→ 再输入计算条件
→ 再展示结果
→ 最后给出比较和建议
```

成本页为六步流程，市场页先选具体配置，购买参考与生活平替不再自动选择第一条结果。

### Apple 产品

- 37 款 iPhone，覆盖 iPhone 8、X、XR、XS/XS Max 至当前主流机型，共 113 个容量配置。
- 18 款 iPad，覆盖标准版、mini、Air 和 Pro，共 120 个容量与网络版本。
- 9 款 MacBook Air，覆盖 M1 至 M5，并提供 96 个内存与 SSD 配置。
- 16 款 MacBook Pro 机型，覆盖 176 个内存与 SSD 配置。
- 所有产品列表按发布时间从新到旧排序。
- iPad 容量与 Wi-Fi / 蜂窝网络联动。
- iPhone 与 iPad 容量跟随机型联动，每个容量与网络版本均有明确价格。
- MacBook Air 与 MacBook Pro 支持内存、SSD 联动，每个配置均有首发价和当前参考价。
- 四类产品共用成本、市场、购买参考、全局搜索和“我的物品”。
- 1–5 年价值趋势、逐年下降金额、环比下降率、累计下降和残值率。
- 产品机龄 / 我的持有时间两种趋势口径。

### 生活平替

- 108 条经过初步去重和安全筛选的生活平替。
- 18 个分类。
- 搜索、分类、可靠性、风险、证据、类型和节省比例筛选。
- 详情、收藏和移动端卡片列表。

### 基础能力

- 官方首发价、Apple 官网当前价、京东自营、天猫 Apple Store、拼多多百亿补贴、二手买入、个人转卖和平台回收分开记录。
- 成本页先展示新品价格基准，再计算用户实际买入渠道下的持有成本。
- 我的物品、本地估值和累计价值下降。
- 全局搜索、深色主题、状态保存。
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
├─ ipad_models.json             # iPad 参数
├─ ipad_market.json             # iPad 市场价格
├─ macbook_air_models.json      # MacBook Air 参数
├─ macbook_air_market.json      # MacBook Air 市场价格
├─ macbook_models.json          # MacBook Pro 参数
├─ macbook_market.json          # MacBook Pro 市场价格
├─ alternatives.json            # 可公开展示的生活平替
├─ alternatives_rejected.json   # 被隔离的高风险示例与原因
├─ categories.json              # 生活平替分类
├─ sources.json                 # 产品和价格资料来源
├─ strategies.json              # 换机策略
└─ site.json                    # 版本与模块信息
```

## 数据口径

- 官方规格、发布日期和首发价格优先使用 Apple 官方资料。
- “核验”表示官方或明确价格；“样本”表示公开案例；“参考”表示模型区间。
- 官方首发价用于折旧基准；Apple 官网当前价代表在售官方价；京东、天猫和拼多多价格按渠道单独记录。
- 二手参考区间根据首发价格、产品机龄、产品线残值曲线和渠道价差生成，不是实时成交承诺。
- 每个可选择配置都保存显式价格记录；无独立成交样本的组合按配置价差与残值比例生成，并标记为“参考”。
- Apple 当前在售配置标记为“核验”；Mac 定制配置的推算价格标记为“官方配置参考”，最终以结算页为准。
- RAM 等 Apple 未公开字段明确标注为拆解或行业口径。

## 本地数据

“我的物品”、平替收藏、主题和筛选条件保存在浏览器 LocalStorage 中，不上传服务器。清除浏览器网站数据会删除这些记录，请定期导出 JSON。

## 项目文档

- [最终网站结构](docs/SITE_MAP.md)
- [v0.6.0 现状思维导图](docs/CURRENT_SITE_MAP_V0.6.0.md)
- [页面逻辑审查](docs/LOGIC_AUDIT_V0.6.0.md)
- [v0.6.1 重构计划](docs/REFRACTOR_PLAN_V0.6.1.md)
- [开发计划](docs/DEVELOPMENT_PLAN.md)
- [数据模型](docs/DATA_MODEL.md)
- [生活平替审核说明](docs/ALTERNATIVES_REVIEW.md)
- [测试记录](docs/TEST_REPORT.md)
- [数据来源说明](SOURCES.md)


## v0.6.0 新增品类

Android 手机、ThinkPad、运动/全景相机、无人机、NAS、硬盘/SSD和自行车已进入统一成本与残值框架。新增品类的价格以带日期的参考模型为主，正式交易前应重新采样。

## v0.6.1 逻辑重构

- 成本、市场、购买参考、生活平替和我的页面按依赖顺序重新排列。
- 市场页只比较同一具体配置。
- 我的物品保存明确配置字段。
- 详细审查见 `docs/CURRENT_SITE_MAP_V0.6.0.md`、`docs/LOGIC_AUDIT_V0.6.0.md` 和 `docs/REFRACTOR_PLAN_V0.6.1.md`。
