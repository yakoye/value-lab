# iPhone Value Lab

一个可直接部署到 GitHub Pages 的中国 iPhone 价格、买卖价差和总持有成本数据库。

## 已包含

- 2019–2026 年 31 款主流 iPhone 参数。
- CPU、GPU 核数、RAM、屏幕、刷新率、重量、续航、接口、相机、Apple Intelligence、关键更新、优缺点和购买判断。
- Apple 官网、官方旗舰店活动、闲鱼、淘宝二手、转转官方验、爱回收、转转回收、Apple Trade In 等价格口径。
- 买入价与卖出价严格分开，自动计算即时价差、价差率、持有期退出价和年均成本。
- 已核验 / 公开样本 / 模型估算三级可信度。
- JSON 和 CSV 导出。
- 无框架、无构建步骤、无第三方脚本。

## 部署 GitHub Pages

1. 创建仓库并把本目录全部内容提交到 `main` 分支。
2. 进入 `Settings → Pages`。
3. 选择 `Deploy from a branch`、`main`、`/(root)`。
4. 保存后访问 GitHub Pages 地址。

## 本地预览

```bash
python -m http.server 8080
```

浏览器打开 `http://localhost:8080`。

## 数据维护

- `data/models.json`：机型硬件与购买判断。
- `data/market.json`：价格区间、平台、方向、机况、可信度、来源。
- `data/strategies.json`：换机策略。
- `data/sources.json`：来源说明。

价格平台通常依赖 App、登录、定位、活动券和检测流程，静态网页无法保证实时性。模型估算数据只适合比较结构，不应当作平台承诺报价。成交前请在同一天、同容量、同成色、同电池和同维修历史下重新询价。
