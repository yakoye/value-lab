# 数据模型

## 高价值物品通用字段

```text
id
category
brand
name
release
launchPrice
currentOfficialPrice
variant
condition
source
confidence
updatedAt
```

## 产品变体

### iPhone

```text
modelId
storage
```

### iPad

```text
modelId
storage
network: Wi-Fi | Wi-Fi + 蜂窝网络
cellularPremium
pencilCompatibility
```

### MacBook

```text
modelId
size
chip
cpuCores
gpuCores
memory
storage
```

## 市场价格记录

```text
modelId
side: buy | sell
kind: new_launch | new_official | new_retail | used_personal | used_retail | personal_sale | recycle | trade_in
channel
storage
network
condition
low
high
date
confidence
sourceId
note
```

## 容量和网络换算

- 官方新品：按目标容量和网络版本的官方价差计算。
- 二手价格：缺少独立样本时，按容量升级成本的一部分折算为二手残值。
- 衍生记录必须设置 `derived: true` 并显示换算说明。
- iPad 蜂窝版溢价独立于容量溢价。

## 成本公式

```text
总持有成本
= 买入价格
- 最终卖出收入
+ 交易费用
+ 维修与维护费用
+ 耗材费用
+ 保险税费
+ 融资成本
```

## 价值趋势字段

```text
时间点
参考价值
本期下降金额
本期下降率
累计下降金额
累计下降率
残值率
```

## 生活平替字段

```text
id
original
alternative
category
type
reliability
risk
evidence
savingMin
savingMax
why
limits
safety
tags
status
source
updated
```

## v0.5.1 配置价格模型

每个可选择配置现在都使用显式 `configurations` 数组，不再只保存基础容量：

- iPhone：按容量区分。
- iPad：按容量与 Wi-Fi / 蜂窝网络区分。
- MacBook Air / Pro：按统一内存与 SSD 容量区分。

每个配置包含：

```json
{
  "id": "24gb-1tb",
  "memory": "24GB",
  "storage": "1TB",
  "launchPrice": 19499,
  "currentOfficialPrice": 19499,
  "priceBasis": "official_current_estimate"
}
```

价格依据分为：

- `official_current`：Apple 当前在线商店可明确核验的配置价格。
- `official_current_estimate`：当前基础配置与公开选配价差形成的配置参考，结算前需复核。
- `launch_ladder_reference`：历史容量梯度参考。
- `launch_cto_reference`：历史 Mac 定制配置梯度参考。

所有配置均有对应买入和卖出市场记录。没有独立成交样本的配置，会使用同机型接近配置、官方/历史配置价差和二手残值比例换算，统一标记为“参考”。


## v0.5.2 新品价格基准

成本计算不再只显示用户选中的买入价，而是先展示同一配置的新品价格基准：

```text
官方首发价
Apple 官网当前价
京东自营新品价
天猫 Apple Store 新品价
拼多多百亿补贴新品价
当前最低新机价
```

口径：

- `new_launch`：产品发布时的官方定价，用于长期折旧基准，不代表当前可购买价格。
- `new_official`：Apple 中国在线商店当前在售价格。
- `new_retail`：电商当前新品参考区间，必须保存渠道、日期、可信度和计算/采样说明。
- 新品参考与二手买入、个人转卖、平台回收严格分离。
- 没有可核实当前价格的已停产产品显示“已停售”或“暂无可信当前价”，不能把首发价冒充当前价格。

## v0.6.1 本地物品配置字段

“我的物品”不再只保存机型并从备注猜测配置，而是显式保存：

```text
type
modelId
memory
storage
network
date
price
note
created
```

旧版本记录仍可读取：若缺少显式配置，才会尝试从备注或机型基础配置中回退推断。

## 页面依赖规则

结果区必须依赖明确的前置字段：

```text
新品价格 = 产品类别 + 机型 + 配置
市场价格 = 产品类别 + 机型 + 配置 + 市场筛选
持有成本 = 产品与配置 + 买入方式 + 卖出方式 + 持有年限 + 费用
产品详情 = 用户明确选择的产品
平替详情 = 用户明确选择的方案
资产汇总 = 至少一条已保存物品
```
