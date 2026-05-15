# UserMesh 快速开始指南

欢迎使用 UserMesh！本指南将帮助你在 15 分钟内完成集成。

## 目录

- [安装](#安装)
- [基础设置](#基础设置)
- [记录事件](#记录事件)
- [用户识别](#用户识别)
- [下一步](#下一步)

## 安装

### 系统要求

- Node.js 18+
- npm 或 bun 包管理器
- 至少一个分析平台的 API 密钥

### 选项 1: 克隆并链接（开发模式）

```bash
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git
cd UserMesh
npm install
npm run build

# 在你的项目中
npm link /path/to/UserMesh
```

### 选项 2: Git URL 安装

编辑你的 `package.json`：

```json
{
  "dependencies": {
    "@usermesh/sdk-web": "git+https://gitcode.com/ctkqiang_sr/UserMesh.git#main"
  }
}
```

然后运行：

```bash
npm install
```

### 选项 3: 构建并复制

```bash
cd UserMesh
npm run build
cp -r dist/* /path/to/your/project/node_modules/@usermesh/sdk-web/
```

## 基础设置

### 第 1 步：创建 SDK 实例

```typescript
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

const sdk = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-ABC123XYZ'  // 从 GA4 管理面板获取
    },
    postHogPlatform: {
      isEnabled: true,
      projectApiKey: 'phc_abc123...'  // 从 PostHog 项目设置获取
    },
    mixpanelPlatform: {
      isEnabled: true,
      projectToken: 'abc123def456'  // 从 Mixpanel 项目设置获取
    },
    microsoftClarity: {
      isEnabled: true,
      projectIdentifier: 'clarity123'  // 从 Clarity 设置获取
    }
  },
  sdkBehaviorConfiguration: {
    enableDetailedDebugLogging: true,  // 生产环境设置为 false
    operatingMode: 'development',
    flushIntervalMilliseconds: 5000,  // 每 5 秒批量发送事件
    maximumQueuedEventsBeforeFlushing: 10  // 或当有 10 个事件时发送
  },
  securityAndPrivacyConfiguration: {
    enableDataEncryption: true,  // 加密本地存储的事件
    shouldRedactPersonalInformation: false  // 需要时设置为 true
  }
});
```

### 第 2 步：初始化 SDK

```typescript
// 在应用启动时调用
await sdk.initializeUserMeshAnalyticsSdk();

console.log('UserMesh SDK 初始化成功！');
```

### 第 3 步：集成到你的应用

**React 示例：**

```typescript
import React, { useEffect } from 'react';
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

let sdk: UserMeshAnalyticsSdkClient;

function App() {
  useEffect(() => {
    // 应用启动时初始化 SDK
    async function initAnalytics() {
      sdk = new UserMeshAnalyticsSdkClient({
        analyticsIntegrations: {
          googleAnalytics4: {
            isEnabled: true,
            googlePropertyIdentifier: 'G-ABC123XYZ'
          }
        }
      });
      
      await sdk.initializeUserMeshAnalyticsSdk();
    }

    initAnalytics();

    return () => {
      // 组件卸载时清理
      sdk?.destroyUserMeshSdkAndCleanup();
    };
  }, []);

  return <div>你的应用在这里</div>;
}

export default App;
```

**原生 JavaScript：**

```javascript
let sdk;

async function initAnalytics() {
  const { UserMeshAnalyticsSdkClient } = await import('@usermesh/sdk-web');
  
  sdk = new UserMeshAnalyticsSdkClient({
    analyticsIntegrations: {
      googleAnalytics4: {
        isEnabled: true,
        googlePropertyIdentifier: 'G-ABC123XYZ'
      }
    }
  });

  await sdk.initializeUserMeshAnalyticsSdk();
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initAnalytics);

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  sdk?.destroyUserMeshSdkAndCleanup();
});
```

## 记录事件

### 基础事件追踪

```typescript
// 追踪简单事件
await sdk.recordAnalyticsEvent('button_clicked', {
  buttonName: 'signup_cta',
  location: 'hero_section'
});
```

### 带属性的事件

```typescript
// 追踪购买事件
await sdk.recordAnalyticsEvent('purchase_completed', {
  orderId: 'order_12345',
  amount: 99.99,
  currency: 'USD',
  productCount: 3,
  paymentMethod: 'credit_card',
  discountCode: 'SUMMER20',
  discountAmount: 10.00
});
```

### 页面浏览追踪

```typescript
// 追踪用户浏览页面
await sdk.trackPageView(
  'https://example.com/products',
  '产品页面',
  {
    category: 'electronics',
    viewType: 'grid'
  }
);
```

### 错误追踪

```typescript
// 追踪应用中的错误
try {
  await performRiskyOperation();
} catch (error) {
  await sdk.reportErrorOccurrence(
    'critical',
    'RiskyOperation',
    error instanceof Error ? error.message : String(error),
    {
      operation: 'performRiskyOperation',
      timestamp: Date.now(),
      context: '用户交互'
    }
  );
}
```

## 用户识别

### 用户注册时

```typescript
// 用户完成注册后识别用户
await sdk.identifyCurrentUser('user_abc123', {
  email: 'user@example.com',
  firstName: '张',
  lastName: '三',
  accountType: 'premium',
  signupDate: '2026-05-15',
  source: 'organic_search'
});
```

### 更新用户属性

```typescript
// 更新用户属性，无需重新识别
await sdk.updateUserTraits({
  accountType: 'enterprise',
  planName: '商业版',
  teamSize: 15,
  lastLoginDate: new Date().toISOString()
});
```

### 用户登出时

```typescript
// 登出时清除用户识别
await sdk.clearCurrentUserProfile();
```

## 常见场景

### 电商流程

```typescript
// 用户添加商品到购物车
await sdk.recordAnalyticsEvent('cart_item_added', {
  productId: 'SKU_12345',
  productName: '无线耳机',
  price: 79.99,
  quantity: 1,
  cartValue: 79.99
});

// 用户开始结账
await sdk.recordAnalyticsEvent('checkout_started', {
  cartValue: 79.99,
  itemCount: 1
});

// 用户完成购买
await sdk.identifyCurrentUser('user_abc123', {
  email: 'user@example.com',
  totalSpent: 79.99,
  purchaseCount: 1
});

await sdk.recordAnalyticsEvent('purchase_completed', {
  orderId: 'order_xyz789',
  amount: 79.99,
  currency: 'CNY',
  items: [
    { productId: 'SKU_12345', quantity: 1, price: 79.99 }
  ]
});
```

### SaaS 功能使用

```typescript
// 追踪功能使用
await sdk.recordAnalyticsEvent('feature_used', {
  featureName: '高级搜索',
  featureId: 'feat_search_v2',
  duration: 45000,  // 毫秒
  resultCount: 234,
  filtersApplied: 3
});

// 追踪账户升级
await sdk.recordAnalyticsEvent('plan_upgraded', {
  oldPlan: 'starter',
  newPlan: 'professional',
  upgradeCost: 99.00,
  billingCycle: 'monthly'
});
```

### 金融应用事件

```typescript
// 追踪交易执行
await sdk.recordAnalyticsEvent('trade_executed', {
  tradeType: 'buy',
  symbol: 'AAPL',
  shares: 100,
  price: 150.25,
  totalValue: 15025.00,
  commission: 5.00
});

// 追踪投资组合操作
await sdk.recordAnalyticsEvent('portfolio_rebalanced', {
  previousAllocation: { stocks: 60, bonds: 40 },
  newAllocation: { stocks: 50, bonds: 50 },
  assetsAffected: 5
});
```

## 调试

### 启用调试日志

```typescript
const sdk = new UserMeshAnalyticsSdkClient({
  // ... 其他配置
  sdkBehaviorConfiguration: {
    enableDetailedDebugLogging: true  // 在控制台显示所有操作
  }
});
```

### 检查初始化状态

```typescript
// SDK 初始化后才能发送事件
try {
  await sdk.initializeUserMeshAnalyticsSdk();
  console.log('SDK 已准备好发送事件');
} catch (error) {
  console.error('SDK 初始化失败:', error);
}
```

### 手动刷新事件

```typescript
// 立即强制发送所有已排队的事件
await sdk.flushQueuedEventsToAnalyticsPlatforms();
```

## 下一步

- **阅读 API 文档**: 查看 [API_REFERENCE.md](api/API_REFERENCE.md) 了解所有可用方法和选项
- **浏览示例**: 查看 [EXAMPLES_ZH.md](examples/EXAMPLES_ZH.md) 了解领域特定的用例
- **了解加密**: 在 [ENCRYPTION_SECURITY.md](ENCRYPTION_SECURITY.md) 了解数据安全
- **设置领域事件**: Phase 3 中将提供领域特定的事件模式（即将推出）

## 获取帮助

- **邮箱**: ctkqiang@dingtalk.com
- **仓库**: https://gitcode.com/ctkqiang_sr/UserMesh.git
- **问题**: 在仓库中提交 Issue

---

**后续步骤**: 完成本指南后，浏览 API 参考以了解高级功能，如事件验证、离线持久化和自定义端点。
