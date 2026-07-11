# iPhone Value Lab

一个可直接部署到 GitHub Pages 的中国 iPhone 买入价、退出价、平台价差和总持有成本比较工具。

## 当前内容

- 31 款 2019–2026 年主流 iPhone。
- 202 条新机、个人二手、平台二手、个人转卖、回收和 Trade In 价格记录。
- CPU、GPU、RAM、屏幕、刷新率、重量、续航、接口、相机、Apple Intelligence 硬件支持、关键更新、优缺点和购买判断。
- 买入价与卖出价分开计算，即时价差、持有后退出价、总成本和年均成本自动生成。
- 核验、公开样本、参考区间三级数据标记。
- JSON 和 CSV 导出。

## 产品交互

- 浅色/深色主题，首次跟随系统，手动切换后会保存。
- 当前页面、成本参数、筛选条件和机型详情会保存在浏览器中。
- 桌面端使用顶部导航和右侧详情栏。
- 移动端使用底部导航，机型详情以弹层打开。
- 导出完成、恢复默认等操作使用轻量提示。
- 导出菜单支持点击外部关闭、ESC 关闭和键盘上下选择。

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

浏览器打开 `http://localhost:8080`。不要直接双击 `index.html`，浏览器可能阻止读取 JSON 数据。

## 数据维护

- `data/models.json`：机型规格、关键更新、优缺点和购买判断。
- `data/market.json`：价格区间、方向、渠道、机况、可信度和来源。
- `data/strategies.json`：长期换机策略。
- `data/sources.json`：资料来源。
- `data/audit.json`：数据量与完整性统计。

市场价格受地区、活动券、电池健康、维修记录和检测结果影响。更新价格时，应保持日期、容量、机况和价格方向完整，不要把平台二手零售价与平台回收价合并成一个“二手价”。

## 发布前检查

开发回归记录见 `REVIEW_NOTES.md`。正式发布前仍建议在真实设备上复查 Windows Chrome/Edge、macOS Safari、Android Chrome 和 iPhone Safari。
