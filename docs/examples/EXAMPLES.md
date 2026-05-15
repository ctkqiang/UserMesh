# UserMesh Examples

Author: 钟智强  
Email: ctkqiang@dingtalk.com  
Repository: https://gitcode.com/ctkqiang_sr/UserMesh.git

Real-world examples for different application domains.

## Table of Contents

1. E-Commerce Application
2. Finance/Trading Application
3. Social Media Application
4. SaaS Product
5. React Integration

---

## 1. E-Commerce Application

Complete analytics for an online store.

### Setup

```typescript
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

const ecommerceSDK = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-ECOMMERCE123'
    },
    postHogPlatform: {
      isEnabled: true,
      projectApiKey: 'phc_ecommerce...'
    }
  },
  sdkBehaviorConfiguration: {
    maximumQueuedEventsBeforeFlushing: 30,
    flushIntervalMilliseconds: 10000
  }
});

await ecommerceSDK.initializeUserMeshAnalyticsSdk();
```

### User Lifecycle

```typescript
// User visits store (anonymous)
await ecommerceSDK.recordAnalyticsEvent('page_viewed', {
  pageName: 'home',
  pageUrl: '/',
  sourceReferrer: 'google.com'
});

// User signs up
await ecommerceSDK.recordAnalyticsEvent('user_signup', {
  signupMethod: 'email',
  promoCodeUsed: 'WELCOME10'
});

// Identify the new user
await ecommerceSDK.identifyCurrentUser('user_12345', {
  email: 'customer@example.com',
  customerName: 'John Doe',
  accountCreationDate: '2024-02-15',
  accountStatus: 'active',
  customerSegment: 'new_customer'
});

// User logs in (after signup)
await ecommerceSDK.recordAnalyticsEvent('user_login', {
  loginMethod: 'email',
  deviceType: 'desktop'
});
```

### Shopping Journey

```typescript
// Product browsing
await ecommerceSDK.recordAnalyticsEvent('product_viewed', {
  productId: 'WIDGET-123',
  productName: 'Premium Widget',
  productCategory: 'widgets',
  productPrice: 29.99,
  productRating: 4.5,
  inStock: true
});

// Search
await ecommerceSDK.recordAnalyticsEvent('search_performed', {
  searchQuery: 'blue widgets',
  searchCategory: 'products',
  resultsCount: 42,
  filters: ['color:blue', 'price:0-50'],
  sortBy: 'popular'
});

// Add to cart
await ecommerceSDK.recordAnalyticsEvent('add_to_cart', {
  productId: 'WIDGET-123',
  productName: 'Premium Widget',
  quantity: 2,
  price: 29.99,
  cartTotal: 59.98,
  cartItemCount: 2
});

// View cart
await ecommerceSDK.recordAnalyticsEvent('view_cart', {
  cartItemCount: 2,
  cartTotal: 59.98,
  cartValue: 59.98,
  estimatedShipping: 10.00,
  estimatedTax: 4.80
});

// Remove from cart
await ecommerceSDK.recordAnalyticsEvent('remove_from_cart', {
  productId: 'WIDGET-456',
  quantity: 1,
  price: 19.99
});

// Proceed to checkout
await ecommerceSDK.recordAnalyticsEvent('checkout_started', {
  cartItemCount: 2,
  cartTotal: 59.98,
  estimatedShipping: 10.00,
  estimatedTax: 4.80
});

// Apply coupon
await ecommerceSDK.recordAnalyticsEvent('coupon_applied', {
  couponCode: 'SAVE10',
  discountAmount: 6.00,
  newCartTotal: 53.98
});

// Enter shipping info
await ecommerceSDK.recordAnalyticsEvent('shipping_info_entered', {
  shippingMethod: 'standard',
  shippingCost: 10.00,
  estimatedDeliveryDays: 5
});

// Enter payment info
await ecommerceSDK.recordAnalyticsEvent('payment_info_entered', {
  paymentMethod: 'credit_card',
  cardLastFourDigits: '4242'
});

// Purchase completed
await ecommerceSDK.recordAnalyticsEvent('purchase_completed', {
  transactionId: 'order_ABC123',
  orderId: 'order_ABC123',
  totalAmount: 74.78,
  itemCount: 2,
  itemIds: ['WIDGET-123', 'WIDGET-456'],
  itemNames: ['Premium Widget', 'Standard Widget'],
  itemPrices: [29.99, 19.99],
  itemQuantities: [2, 1],
  discount: 6.00,
  couponCode: 'SAVE10',
  shippingCost: 10.00,
  taxAmount: 4.80,
  paymentMethod: 'credit_card',
  shippingAddress: 'New York, NY'
});

// Update user with purchase info
await ecommerceSDK.updateUserTraits({
  totalPurchases: 1,
  totalSpentAmount: 74.78,
  lastPurchaseDate: '2024-02-15',
  customerLifetimeValue: 74.78,
  orderCount: 1
});
```

### Post-Purchase

```typescript
// Order confirmation viewed
await ecommerceSDK.recordAnalyticsEvent('page_viewed', {
  pageName: 'order_confirmation',
  orderId: 'order_ABC123',
  orderTotal: 74.78
});

// Product review submission
await ecommerceSDK.recordAnalyticsEvent('review_submitted', {
  productId: 'WIDGET-123',
  rating: 5,
  reviewText: 'Great product!',
  verifiedPurchase: true
});

// Refund requested
await ecommerceSDK.recordAnalyticsEvent('refund_requested', {
  orderId: 'order_ABC123',
  reason: 'wrong_size',
  refundAmount: 29.99
});
```

---

## 2. Finance/Trading Application

Analytics for investment and trading platforms.

### Setup

```typescript
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

const financeSDK = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-FINANCE123'
    },
    mixpanelPlatform: {
      isEnabled: true,
      projectToken: 'mixpanel_finance_token'
    }
  },
  securityAndPrivacyConfiguration: {
    enableDataEncryption: true,
    shouldRedactPersonalInformation: true
  }
});

await financeSDK.initializeUserMeshAnalyticsSdk();
```

### User Account

```typescript
// User signs up for trading
await financeSDK.recordAnalyticsEvent('user_signup', {
  accountType: 'individual',
  investmentExperience: 'beginner',
  accountFundingMethod: 'bank_transfer',
  signupReferralSource: 'facebook_ad'
});

// Identify user
await financeSDK.identifyCurrentUser('trader_12345', {
  email: 'trader@example.com',
  accountType: 'individual',
  investmentExperience: 'beginner',
  accountStatus: 'active',
  accountFundingDate: '2024-01-15',
  verificationStatus: 'approved'
});

// Account verification completed
await financeSDK.recordAnalyticsEvent('account_verified', {
  verificationMethod: 'government_id',
  verificationTime: 5  // minutes
});

// Account funded
await financeSDK.recordAnalyticsEvent('account_funded', {
  fundingAmount: 1000,
  fundingMethod: 'bank_transfer',
  depositFee: 0
});

// Update user traits
await financeSDK.updateUserTraits({
  accountBalance: 1000,
  verificationStatus: 'approved',
  accountAge: 1,
  accountAgeDays: 1
});
```

### Trading Actions

```typescript
// User searches for stock
await financeSDK.recordAnalyticsEvent('stock_searched', {
  ticker: 'AAPL',
  searchType: 'manual',
  searchSource: 'search_bar'
});

// User views stock details
await financeSDK.recordAnalyticsEvent('stock_details_viewed', {
  ticker: 'AAPL',
  companyName: 'Apple Inc',
  currentPrice: 180.50,
  dayChange: 2.50,
  dayChangePercent: 1.41,
  marketCap: '2.8T'
});

// User places buy order
await financeSDK.recordAnalyticsEvent('buy_order_placed', {
  ticker: 'AAPL',
  orderType: 'market',
  quantity: 10,
  pricePerShare: 180.50,
  totalCost: 1805.00,
  orderStatus: 'pending',
  accountBalanceBefore: 1000,
  accountBalanceAfter: -805  // Negative (will settle)
});

// Order executed
await financeSDK.recordAnalyticsEvent('order_executed', {
  orderId: 'order_xyz',
  ticker: 'AAPL',
  orderType: 'buy',
  orderSide: 'long',
  quantity: 10,
  executionPrice: 180.45,
  totalValue: 1804.50,
  executionTime: 2  // seconds
});

// Update user portfolio
await financeSDK.updateUserTraits({
  portfolioValue: 1804.50,
  holdingsCount: 1,
  totalTrades: 1
});

// Place sell order
await financeSDK.recordAnalyticsEvent('sell_order_placed', {
  ticker: 'AAPL',
  quantity: 5,
  pricePerShare: 185.00,
  totalProceeds: 925.00,
  gainLoss: 22.50,
  gainLossPercent: 2.49
});

// Order executed
await financeSDK.recordAnalyticsEvent('order_executed', {
  orderId: 'order_abc',
  ticker: 'AAPL',
  orderType: 'sell',
  quantity: 5,
  executionPrice: 185.00,
  totalValue: 925.00,
  realizedGain: 22.50
});

// Update after sale
await financeSDK.updateUserTraits({
  portfolioValue: 2729.50,
  totalTrades: 2,
  realizedGains: 22.50,
  tradingActivity: 'active'
});
```

### Portfolio & Investments

```typescript
// View portfolio
await financeSDK.recordAnalyticsEvent('portfolio_viewed', {
  totalValue: 2729.50,
  holdingsCount: 1,
  dayChange: 45.25,
  dayChangePercent: 1.69,
  allTimeReturn: 122.50
});

// Set price alert
await financeSDK.recordAnalyticsEvent('price_alert_set', {
  ticker: 'AAPL',
  alertType: 'price_above',
  alertPrice: 190,
  currentPrice: 185.00
});

// Price alert triggered
await financeSDK.recordAnalyticsEvent('price_alert_triggered', {
  ticker: 'AAPL',
  alertType: 'price_above',
  alertPrice: 190,
  triggerPrice: 190.50
});
```

---

## 3. Social Media Application

Analytics for social platforms.

### Setup

```typescript
const socialSDK = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-SOCIAL123'
    },
    postHogPlatform: {
      isEnabled: true,
      projectApiKey: 'phc_social...'
    }
  }
});

await socialSDK.initializeUserMeshAnalyticsSdk();
```

### User Actions

```typescript
// User signs up
await socialSDK.recordAnalyticsEvent('user_signup', {
  signupMethod: 'email',
  birthDate: '1990-01-15',
  location: 'New York, NY',
  interests: ['tech', 'travel', 'photography']
});

// Identify user
await socialSDK.identifyCurrentUser('user_social_123', {
  username: 'john_doe',
  email: 'john@example.com',
  profileName: 'John Doe',
  profilePhoto: true,
  bioLength: 150,
  followerCount: 0,
  followingCount: 0,
  accountStatus: 'active'
});

// User uploads profile picture
await socialSDK.recordAnalyticsEvent('profile_photo_uploaded', {
  photoSize: 2.5,  // MB
  photoFormat: 'jpeg',
  photoResolution: '1920x1080'
});

// Follow user
await socialSDK.recordAnalyticsEvent('user_followed', {
  followedUserId: 'user_456',
  followedUsername: 'jane_doe',
  followerCount: 1
});

// Update user traits
await socialSDK.updateUserTraits({
  followerCount: 1,
  followingCount: 5,
  profileCompleteness: 80
});
```

### Content Creation

```typescript
// Create post
await socialSDK.recordAnalyticsEvent('post_created', {
  postType: 'text',
  contentLength: 280,
  hasHashtags: true,
  hashtagCount: 3,
  hashtags: ['tech', 'startup', 'innovation'],
  hasImage: false,
  hasVideo: false,
  visibility: 'public'
});

// Post published
await socialSDK.recordAnalyticsEvent('post_published', {
  postId: 'post_xyz',
  postType: 'text',
  visibility: 'public'
});

// Update user
await socialSDK.updateUserTraits({
  postCount: 1,
  lastPostDate: '2024-02-15'
});

// Post gets engagement
await socialSDK.recordAnalyticsEvent('post_liked', {
  postId: 'post_xyz',
  postType: 'text',
  likeCount: 1,
  totalEngagement: 1
});

// Comment on post
await socialSDK.recordAnalyticsEvent('comment_posted', {
  postId: 'post_xyz',
  commentId: 'comment_abc',
  commentLength: 100,
  parentCommentId: null,
  hasImage: false
});

// Share post
await socialSDK.recordAnalyticsEvent('post_shared', {
  postId: 'post_xyz',
  sharedToFeed: true,
  shareCount: 1
});
```

---

## 4. SaaS Product

Analytics for a productivity SaaS application.

### Setup

```typescript
const saasSDK = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-SAAS123'
    },
    postHogPlatform: {
      isEnabled: true,
      projectApiKey: 'phc_saas...'
    }
  }
});

await saasSDK.initializeUserMeshAnalyticsSdk();
```

### Onboarding

```typescript
// User signs up for free trial
await saasSDK.recordAnalyticsEvent('user_signup', {
  signupType: 'free_trial',
  planChosen: 'pro',
  companyName: 'Acme Corp',
  companySize: '10-50'
});

// Identify user
await saasSDK.identifyCurrentUser('saas_user_123', {
  email: 'admin@acmecorp.com',
  companyName: 'Acme Corp',
  planType: 'free_trial',
  trialDaysRemaining: 14,
  signupDate: '2024-02-15'
});

// Complete onboarding
await saasSDK.recordAnalyticsEvent('onboarding_completed', {
  onboardingDuration: 15,  // minutes
  profileSetup: true,
  teamInvited: true,
  dataImported: false
});

// Update user
await saasSDK.updateUserTraits({
  onboardingStatus: 'completed',
  accountStatus: 'active_trial'
});
```

### Feature Usage

```typescript
// Feature used
await saasSDK.recordAnalyticsEvent('feature_used', {
  featureName: 'create_project',
  featureCategory: 'projects',
  featureUsageCount: 1,
  featureDuration: 5  // seconds
});

// Create workspace
await saasSDK.recordAnalyticsEvent('workspace_created', {
  workspaceName: 'Marketing Team',
  workspaceSize: 1,
  workspacePermissions: 'private'
});

// Invite team member
await saasSDK.recordAnalyticsEvent('team_member_invited', {
  teamMemberEmail: 'user@acmecorp.com',
  teamMemberRole: 'editor',
  teamSize: 2
});

// Create task/project/item
await saasSDK.recordAnalyticsEvent('item_created', {
  itemType: 'task',
  itemCategory: 'projects',
  itemDescription: 'Detailed description here'
});

// Update item
await saasSDK.recordAnalyticsEvent('item_updated', {
  itemType: 'task',
  updateType: 'status_change',
  newStatus: 'in_progress'
});

// Complete task
await saasSDK.recordAnalyticsEvent('item_completed', {
  itemType: 'task',
  completionTime: 120,  // minutes
  daysToComplete: 2
});
```

### Subscription Management

```typescript
// Upgrade to paid plan
await saasSDK.recordAnalyticsEvent('plan_upgraded', {
  fromPlan: 'free_trial',
  toPlan: 'pro',
  pricePerMonth: 29,
  billingCycle: 'monthly',
  upgradeReason: 'need_more_features'
});

// Update user with plan info
await saasSDK.updateUserTraits({
  planType: 'pro',
  paymentStatus: 'active',
  billingCycle: 'monthly',
  monthlyRecurringRevenue: 29,
  accountStatus: 'paying_customer'
});

// Downgrade plan
await saasSDK.recordAnalyticsEvent('plan_downgraded', {
  fromPlan: 'pro',
  toPlan: 'starter',
  downgradeReason: 'cost_reduction',
  downgradeSavings: 19
});

// Add team seats
await saasSDK.recordAnalyticsEvent('seats_added', {
  seatsAdded: 2,
  seatsTotal: 3,
  seatPrice: 15,
  additionalCost: 30
});

// Cancel subscription
await saasSDK.recordAnalyticsEvent('subscription_cancelled', {
  fromPlan: 'pro',
  cancellationReason: 'no_longer_needed',
  monthsAsCustomer: 6,
  refundEligible: true
});
```

---

## 5. React Integration

Using UserMesh with React components.

### Setup

```typescript
// hooks/useAnalytics.ts
import { useEffect } from 'react';
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';
import { useUserMeshUserProfileStore } from '@usermesh/sdk-web';

let sdk: UserMeshAnalyticsSdkClient | null = null;

export function useAnalytics() {
  useEffect(() => {
    if (!sdk) {
      sdk = new UserMeshAnalyticsSdkClient({
        analyticsIntegrations: {
          googleAnalytics4: {
            isEnabled: true,
            googlePropertyIdentifier: 'G-REACT123'
          }
        }
      });
      sdk.initializeUserMeshAnalyticsSdk();
    }
  }, []);

  return {
    trackEvent: (name: string, props?: Record<string, unknown>) =>
      sdk?.recordAnalyticsEvent(name, props),
    identifyUser: (userId: string, traits?: Record<string, unknown>) =>
      sdk?.identifyCurrentUser(userId, traits || {}),
    trackPageView: (page: string, props?: Record<string, unknown>) =>
      sdk?.trackPageView(page, props)
  };
}
```

### Component Examples

```typescript
// components/SignupForm.tsx
import { useAnalytics } from '../hooks/useAnalytics';

export function SignupForm() {
  const { trackEvent, identifyUser } = useAnalytics();

  async function handleSignup(email: string, password: string) {
    try {
      // Track signup attempt
      await trackEvent('signup_attempted', { email });

      // Create user (your code here)
      const userId = await createUser(email, password);

      // Track successful signup
      await trackEvent('signup_completed', {
        email,
        signupMethod: 'email'
      });

      // Identify user
      await identifyUser(userId, {
        email,
        signupDate: new Date().toISOString()
      });
    } catch (error) {
      // Track error
      await trackEvent('signup_error', {
        error: error.message
      });
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSignup(
        formData.get('email') as string,
        formData.get('password') as string
      );
    }}>
      {/* Form fields */}
    </form>
  );
}
```

```typescript
// components/Product.tsx
import { useEffect } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

export function Product({ productId }: { productId: string }) {
  const { trackEvent } = useAnalytics();
  const [product, setProduct] = React.useState(null);

  useEffect(() => {
    // Track page view
    trackEvent('product_viewed', { productId });

    // Load product
    loadProduct(productId).then(setProduct);
  }, [productId]);

  async function handleAddToCart() {
    await trackEvent('add_to_cart', {
      productId,
      productName: product.name,
      price: product.price
    });
    // Add to cart logic
  }

  if (!product) return <div>Loading...</div>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>Price: ${product.price}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}
```

```typescript
// components/Checkout.tsx
import { useAnalytics } from '../hooks/useAnalytics';

export function Checkout({ cartItems }: { cartItems: CartItem[] }) {
  const { trackEvent } = useAnalytics();

  async function handleCheckout() {
    // Track checkout started
    await trackEvent('checkout_started', {
      itemCount: cartItems.length,
      cartTotal: cartItems.reduce((sum, item) => sum + item.price, 0)
    });

    // Get payment info
    const payment = await getPaymentInfo();

    // Process payment
    try {
      const order = await processPayment(payment);

      // Track successful purchase
      await trackEvent('purchase_completed', {
        orderId: order.id,
        totalAmount: order.total,
        itemCount: cartItems.length,
        paymentMethod: 'credit_card'
      });
    } catch (error) {
      // Track error
      await trackEvent('purchase_error', {
        error: error.message
      });
    }
  }

  return (
    <div>
      {/* Checkout form */}
      <button onClick={handleCheckout}>Complete Purchase</button>
    </div>
  );
}
```

---

## Key Patterns

1. **Track Before & After**
   - Track when action starts
   - Track when action completes
   - Track errors if they occur

2. **Enrich with Context**
   - Include IDs (user, product, order, etc.)
   - Include values (amounts, counts, etc.)
   - Include status (success, failure, pending)

3. **Update User Traits After Changes**
   - New purchases → Update total spent
   - Plan upgrade → Update plan type
   - Profile changes → Update traits

4. **Manual Flush on Critical Events**
   ```typescript
   // Before app exit
   window.addEventListener('beforeunload', async () => {
     await sdk.flushQueuedEventsToAnalyticsPlatforms();
   });
   ```

These examples demonstrate how to use UserMesh across different application types. Adapt these patterns to your specific use cases.
