# Getting Started with UserMesh

Welcome! This guide will help you integrate UserMesh into your application in under 15 minutes.

## Table of Contents

- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Recording Events](#recording-events)
- [Identifying Users](#identifying-users)
- [What's Next](#whats-next)

## Installation

### Prerequisites

- Node.js 18+
- npm or bun package manager
- API keys from at least one analytics platform

### Option 1: Clone and Link (Development)

```bash
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git
cd UserMesh
npm install
npm run build

# In your project
npm link /path/to/UserMesh
```

### Option 2: Git URL Installation

Add to your `package.json`:

```json
{
  "dependencies": {
    "@usermesh/sdk-web": "git+https://gitcode.com/ctkqiang_sr/UserMesh.git#main"
  }
}
```

Then run:

```bash
npm install
```

### Option 3: Build and Copy

```bash
cd UserMesh
npm run build
cp -r dist/* /path/to/your/project/node_modules/@usermesh/sdk-web/
```

## Basic Setup

### Step 1: Create SDK Instance

```typescript
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

const sdk = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-ABC123XYZ'  // From GA4 admin panel
    },
    postHogPlatform: {
      isEnabled: true,
      projectApiKey: 'phc_abc123...'  // From PostHog project settings
    },
    mixpanelPlatform: {
      isEnabled: true,
      projectToken: 'abc123def456'  // From Mixpanel project settings
    },
    microsoftClarity: {
      isEnabled: true,
      projectIdentifier: 'clarity123'  // From Clarity settings
    }
  },
  sdkBehaviorConfiguration: {
    enableDetailedDebugLogging: true,  // Set to false in production
    operatingMode: 'development',
    flushIntervalMilliseconds: 5000,  // Batch events every 5 seconds
    maximumQueuedEventsBeforeFlushing: 10  // Or send when 10 events queued
  },
  securityAndPrivacyConfiguration: {
    enableDataEncryption: true,  // Encrypt events at rest
    shouldRedactPersonalInformation: false  // Set to true if needed
  }
});
```

### Step 2: Initialize SDK

```typescript
// Call this during app startup
await sdk.initializeUserMeshAnalyticsSdk();

console.log('UserMesh SDK initialized successfully!');
```

### Step 3: Add to Your App

**React Example:**

```typescript
import React, { useEffect } from 'react';
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

let sdk: UserMeshAnalyticsSdkClient;

function App() {
  useEffect(() => {
    // Initialize SDK on app startup
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
      // Cleanup on unmount
      sdk?.destroyUserMeshSdkAndCleanup();
    };
  }, []);

  return <div>Your app here</div>;
}

export default App;
```

**Vanilla JavaScript:**

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAnalytics);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  sdk?.destroyUserMeshSdkAndCleanup();
});
```

## Recording Events

### Basic Event Tracking

```typescript
// Track a simple event
await sdk.recordAnalyticsEvent('button_clicked', {
  buttonName: 'signup_cta',
  location: 'hero_section'
});
```

### Event with Properties

```typescript
// Track purchase event
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

### Page View Tracking

```typescript
// Track when user views a page
await sdk.trackPageView(
  'https://example.com/products',
  'Products Page',
  {
    category: 'electronics',
    viewType: 'grid'
  }
);
```

### Error Tracking

```typescript
// Track errors in your application
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
      context: 'user interaction'
    }
  );
}
```

## Identifying Users

### When User Signs Up

```typescript
// Identify user when they complete signup
await sdk.identifyCurrentUser('user_abc123', {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountType: 'premium',
  signupDate: '2026-05-15',
  source: 'organic_search'
});
```

### Update User Traits

```typescript
// Update user properties without full re-identification
await sdk.updateUserTraits({
  accountType: 'enterprise',
  planName: 'business',
  teamSize: 15,
  lastLoginDate: new Date().toISOString()
});
```

### On User Logout

```typescript
// Clear user identification on logout
await sdk.clearCurrentUserProfile();
```

## Common Scenarios

### E-Commerce Flow

```typescript
// User adds item to cart
await sdk.recordAnalyticsEvent('cart_item_added', {
  productId: 'SKU_12345',
  productName: 'Wireless Headphones',
  price: 79.99,
  quantity: 1,
  cartValue: 79.99
});

// User proceeds to checkout
await sdk.recordAnalyticsEvent('checkout_started', {
  cartValue: 79.99,
  itemCount: 1
});

// User completes purchase
await sdk.identifyCurrentUser('user_abc123', {
  email: 'user@example.com',
  totalSpent: 79.99,
  purchaseCount: 1
});

await sdk.recordAnalyticsEvent('purchase_completed', {
  orderId: 'order_xyz789',
  amount: 79.99,
  currency: 'USD',
  items: [
    { productId: 'SKU_12345', quantity: 1, price: 79.99 }
  ]
});
```

### SaaS Feature Usage

```typescript
// Track feature usage
await sdk.recordAnalyticsEvent('feature_used', {
  featureName: 'advanced_search',
  featureId: 'feat_search_v2',
  duration: 45000,  // milliseconds
  resultCount: 234,
  filtersApplied: 3
});

// Track account upgrade
await sdk.recordAnalyticsEvent('plan_upgraded', {
  oldPlan: 'starter',
  newPlan: 'professional',
  upgradeCost: 99.00,
  billingCycle: 'monthly'
});
```

### Financial App Events

```typescript
// Track trade execution
await sdk.recordAnalyticsEvent('trade_executed', {
  tradeType: 'buy',
  symbol: 'AAPL',
  shares: 100,
  price: 150.25,
  totalValue: 15025.00,
  commission: 5.00
});

// Track portfolio action
await sdk.recordAnalyticsEvent('portfolio_rebalanced', {
  previousAllocation: { stocks: 60, bonds: 40 },
  newAllocation: { stocks: 50, bonds: 50 },
  assetsAffected: 5
});
```

## Debugging

### Enable Debug Logging

```typescript
const sdk = new UserMeshAnalyticsSdkClient({
  // ... other config
  sdkBehaviorConfiguration: {
    enableDetailedDebugLogging: true  // Shows all operations in console
  }
});
```

### Check Initialization Status

```typescript
// Events won't send until SDK is initialized
try {
  await sdk.initializeUserMeshAnalyticsSdk();
  console.log('SDK ready to send events');
} catch (error) {
  console.error('Failed to initialize SDK:', error);
}
```

### Manual Event Flushing

```typescript
// Force send all queued events immediately
await sdk.flushQueuedEventsToAnalyticsPlatforms();
```

## What's Next

- **Read the API Reference**: See all available methods and options in [API_REFERENCE.md](api/API_REFERENCE.md)
- **Explore Examples**: Check [EXAMPLES.md](examples/EXAMPLES.md) for domain-specific use cases
- **Learn About Encryption**: Understand data security in [ENCRYPTION_SECURITY.md](ENCRYPTION_SECURITY.md)
- **Set Up Domain Events**: Use domain-specific schemas in Phase 3 (coming soon)

## Getting Help

- **Email**: ctkqiang@dingtalk.com
- **Repository**: https://gitcode.com/ctkqiang_sr/UserMesh.git
- **Issues**: Open an issue on the repository

---

**Next Steps**: After completing this guide, explore the API reference to learn about advanced features like event validation, offline persistence, and custom endpoints.
