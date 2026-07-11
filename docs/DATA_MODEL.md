# 数据模型

## 高价值物品通用字段

```text
id
category
brand
model
variant
releaseDate
launchPrice
currentRetailPrice
usedBuyPrice
privateSellPrice
recyclePrice
condition
source
confidence
updatedAt
```

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

## 平替评价

### 功能可靠性

- A：核心功能基本等同，可长期使用。
- B：大部分场景可替代，但有明确限制。
- C：只适合临时或低要求场景。

### 安全等级

- low：普通合理使用下风险低。
- conditional：必须满足材质、承重、耐温、认证或操作条件。
- high：不进入普通列表。

### 证据等级

- A：标准、官方资料或稳定测试依据。
- B：多个一致的实际使用经验或产品结构依据。
- C：单一经验或尚需更多验证。
