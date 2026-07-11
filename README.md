# Apple Value Lab

可直接部署到 GitHub Pages 的中国 Apple 设备价格与持有成本工具。目前包括 iPhone 与 MacBook Pro。

## 当前内容

### iPhone

- 31 款 2019–2026 年主流 iPhone。
- 202 条新机、个人二手、平台二手、个人转卖、回收和 Trade In 价格记录。
- CPU、GPU、RAM、屏幕、刷新率、重量、续航、接口、相机、Apple Intelligence 硬件支持、关键更新、优缺点和购买判断。
- 选定机型与容量后，显示首发到第 1、2、3、4 年的参考价格、累计跌价和残值率。
- 买入价与卖出价分开计算，即时价差、持有后退出价、总成本和年均成本自动生成。

### MacBook Pro

- 16 款代表配置，覆盖 M1、M1 Pro、M2 Pro、M3、M3 Pro、M4、M4 Pro、M4 Max、M5、M5 Pro 与 M5 Max。
- 68 条个人二手买入、平台验机零售、个人转卖、平台回收与当前官方价格记录。
- 芯片、CPU/GPU 核数、统一内存、SSD、屏幕、重量、续航、接口、摄像头、关键更新、优缺点和购买判断。
- 支持“个人转卖”和“平台回收”两种退出口径的 1–4 年价格趋势。

## 折旧曲线口径

趋势图不是平台对未来成交价的承诺。它使用：

1. 对应配置的中国首发价；
2. 当前同配置或相近配置的二手价格样本；
3. 不同产品线的典型残值曲线；
4. 个人转卖或平台回收的渠道折价；

共同校准第 1–4 年参考值。页面同时展示价格、累计跌价和残值率。高配 Max、超大内存和大容量 SSD 的升级费用在二手市场通常不能等比例收回。

## 产品交互

- 极简紧凑数据表格。
- 浅色/深色主题，手动设置会保存。
- 当前页面、成本参数、筛选条件和所选机型会保存在浏览器中。
- 桌面端顶部导航；移动端底部导航。
- JSON 与 CSV 导出。
- 表格横向滚动、空状态、错误状态和轻量 Toast。

## 部署到 GitHub Pages

1. 新建 GitHub 仓库。
2. 把本目录全部文件提交到 `main` 分支根目录。
3. 打开 `Settings → Pages`。
4. 选择 `Deploy from a branch`、`main`、`/(root)`。
5. 保存并等待 Pages 地址生成。

## 本地预览

```bash
python -m http.server 8080
```

打开 `http://localhost:8080`。不要直接双击 `index.html`，浏览器可能阻止读取 JSON。

## 数据文件

- `data/models.json`：iPhone 规格。
- `data/market.json`：iPhone 市场价格。
- `data/macbook_models.json`：MacBook Pro 规格。
- `data/macbook_market.json`：MacBook Pro 市场价格。
- `data/strategies.json`：长期换机策略。
- `data/sources.json`：资料来源。
- `data/audit.json`：数据量与完整性统计。

价格受日期、地区、活动、容量、外观、电池健康、循环次数、维修史和检测结果影响。平台零售价、个人成交价、回收预估价和检测成交价必须分别维护。
