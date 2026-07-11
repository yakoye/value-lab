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
kind: new_official | used_retail | private | recycle | trade_in
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
