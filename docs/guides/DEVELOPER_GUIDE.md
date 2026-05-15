# UserMesh Developer Guide

Author: 钟智强  
Email: ctkqiang@dingtalk.com  
Repository: https://gitcode.com/ctkqiang_sr/UserMesh.git

## Table of Contents

1. Overview
2. Getting Started
3. Core Concepts
4. Data Structures
5. Configuration
6. Event Tracking
7. User Identification
8. Offline Persistence
9. Encryption & Security
10. Advanced Usage
11. Troubleshooting

---

## 1. Overview

UserMesh is a universal, developer-friendly analytics SDK that works with any domain (finance, social media, e-commerce, SaaS) and aggregates events to multiple analytics platforms simultaneously.

### Why UserMesh?

**Before UserMesh**: Integrating with 4+ analytics platforms means writing 4+ separate integrations, managing 4+ APIs, and dealing with 4+ different event schemas.

```typescript
// WITHOUT UserMesh (4 separate implementations)
ga4.track('user_signup', {...});
posthog.track('user_signup', {...});
mixpanel.track('user_signup', {...});
clarity.track('user_signup', {...});
```

**With UserMesh**: Single unified interface, automatic multi-platform transmission.

```typescript
// WITH UserMesh (single implementation, all platforms)
sdk.recordAnalyticsEvent('user_signup', {...});
```

### What Makes UserMesh Developer-Friendly?

1. **Long, Readable Names** - No cryptic abbreviations
   - Good: `maximumQueuedEventsBeforeFlushing`
   - Bad: `maxQueueSize`

2. **Clear Comments** - WHAT, WHY, WHEN on all code
   ```typescript
   /**
    * Why: Prevents queue from growing unbounded in memory
    * When: Called automatically every 5 seconds or after 20 events
    */
   async flushQueuedEventsToAnalyticsPlatforms(): Promise<void>
   ```

3. **Type Safety** - Strong TypeScript for compile-time errors
   ```typescript
   // TypeScript catches this at compile time
   sdk.recordAnalyticsEvent('user_signup', {
     invalidField: true  // Error: unexpected field
   });
   ```

4. **Self-Documenting Code** - No need to read documentation for obvious things
   ```typescript
   const isUserCurrentlyAuthenticated = true;  // Clear intent
   const userTraitsAndAttributes = { role: 'admin' };  // Clear purpose
   ```

---

## 2. Getting Started

### Installation

```bash
npm install @usermesh/sdk-web
# or
bun add @usermesh/sdk-web
```

### Minimal Setup (5 minutes)

```typescript
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

// Step 1: Create SDK instance
const sdkClient = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-ABC123XYZ'  // Get from GA4 settings
    }
  }
});

// Step 2: Initialize
await sdkClient.initializeUserMeshAnalyticsSdk();

// Step 3: Track an event
await sdkClient.recordAnalyticsEvent('user_signup', {
  signupMethod: 'email'
});

console.log('Event tracked successfully!');
```

### Why Each Step?

1. **Create Instance** - Validates configuration and initializes credentials
2. **Initialize** - Loads offline queue, sets up automatic flushing, connects to platforms
3. **Track Event** - Queues event and transmits to all enabled platforms

---

## 3. Core Concepts

### Events

An event is something that happened in your application.

**What**: An action taken by a user or system
**Why**: Helps you understand user behavior and product usage
**When**: Record whenever something noteworthy happens
**How**: Call `recordAnalyticsEvent('event_name', properties)`

```typescript
// User signed up
await sdk.recordAnalyticsEvent('user_signup', {
  signupMethod: 'email',      // How they signed up
  fromReferral: true,         // Were they referred?
  planType: 'premium'         // What plan did they choose?
});

// User made a purchase
await sdk.recordAnalyticsEvent('purchase_completed', {
  orderId: 'order_12345',
  totalAmount: 99.99,
  productCount: 3,
  paymentMethod: 'credit_card'
});

// User viewed a page
await sdk.recordAnalyticsEvent('page_viewed', {
  pageName: 'checkout',
  pageUrl: '/checkout',
  referrer: 'google.com'
});
```

### Event Properties

Properties provide context about an event.

**What**: Key-value pairs that describe details about the event
**Why**: Enable segmentation, filtering, and analysis in dashboards
**When**: Include whenever they're relevant to understanding the event
**How**: Pass as second argument to `recordAnalyticsEvent()`

```typescript
// Good: Specific, actionable properties
{
  productId: 'prod_123',
  productName: 'Premium Widget',
  productPrice: 29.99,
  discount: 5.00,
  finalPrice: 24.99,
  quantity: 1,
  paymentMethod: 'credit_card'
}

// Avoid: Vague or redundant properties
{
  data: '...',              // Too vague
  value: '...',             // Too generic
  randomField: true         // Not relevant to the event
}
```

### Sessions

A session groups related events from a single user during one interaction period.

**What**: A continuous period of user activity (default: 30 minutes of inactivity)
**Why**: Allows analyzing user journeys and funnel analysis
**When**: Automatically created at SDK initialization
**How**: SDK manages automatically, attached to all events

```typescript
// All these events are part of the same session:
// Session starts at 2:00 PM
await sdk.recordAnalyticsEvent('page_viewed', { page: 'home' });    // 2:05 PM
await sdk.recordAnalyticsEvent('search_performed', { query: 'widget' }); // 2:10 PM
await sdk.recordAnalyticsEvent('product_viewed', { productId: 123 }); // 2:15 PM
// Same session (less than 30 min idle)

// After 30+ minutes of inactivity
// New session starts:
await sdk.recordAnalyticsEvent('page_viewed', { page: 'home' });    // 2:50 PM
// This event is in a NEW session
```

### Users

A user is a person using your application.

**What**: An identified person or anonymous device
**Why**: Enables tracking behavior over time and personalization
**When**: Identify when user logs in, update when traits change
**How**: Call `identifyCurrentUser()` when user authenticates

```typescript
// Before user logs in - anonymous tracking
await sdk.recordAnalyticsEvent('page_viewed', { page: 'home' });

// User logs in
await sdk.identifyCurrentUser('user_12345', {
  email: 'user@example.com',
  accountType: 'premium',
  signupDate: '2024-01-15',
  company: 'Acme Corp'
});

// Now all future events are tracked as this user
await sdk.recordAnalyticsEvent('feature_used', { feature: 'export' });
// This event is now associated with user_12345

// User traits change
await sdk.updateUserTraits({
  accountType: 'enterprise',  // Upgraded!
  additionalSeats: 10
});
```

---

## 4. Data Structures

### AnalyticsEventRecord

The core event structure sent to analytics platforms.

**What**: The complete event object with all metadata
**Why**: Ensures consistency across all platforms and devices
**When**: Automatically created by SDK, rarely created manually
**How**: Usually created by `recordAnalyticsEvent()` internally

```typescript
interface AnalyticsEventRecord {
  // Unique identifier for this event
  uniqueEventIdentifier: string;                    // UUID v4

  // When it happened
  eventTimestampMilliseconds: number;               // Unix milliseconds

  // What happened
  analyticsEventName: string;                       // lowercase_with_underscores

  // Who it happened to (optional)
  authenticatedUserId?: string;                     // 'user_12345'
  anonymousSessionIdentifier?: string;              // Cookie/device ID

  // Grouping
  currentSessionIdentifier: string;                 // Session ID

  // Details about the event
  eventPropertiesData: Record<string, unknown>;     // Custom properties

  // Context (automatically filled)
  contextInformation: {
    applicationPlatform: 'web' | 'mobile' | 'server';
    softwareDevelopmentKitVersion: string;          // '1.0.0'
    applicationVersionString?: string;              // Your app version
    userLanguagePreference?: string;                // 'en-US'
    userTimeZoneString?: string;                    // 'America/New_York'
    pageOrScreenUrl?: string;                       // Current page URL
    referrerOrSourceUrl?: string;                   // How they arrived
  };

  // Device info (automatically detected)
  deviceInformation?: {
    deviceClassification: 'desktop' | 'mobile' | 'tablet';
    operatingSystemName: string;                    // 'Windows', 'iOS'
    browserApplicationName?: string;                // 'Chrome', 'Safari'
    browserVersionNumber?: string;                  // '120.0.0'
    viewportDimensions?: string;                    // '1920x1080'
    deviceModelName?: string;                       // 'iPhone 15'
  };

  // Routing to platforms
  platformRoutingInstructions?: PlatformRoutingInstruction[];
}
```

### UserIdentificationProfile

Information about a user for identification and segmentation.

**What**: User's profile with ID, traits, and metadata
**Why**: Enables user-level analytics and segmentation
**When**: Created when user identifies, updated when traits change
**How**: Pass to `identifyCurrentUser()` or `updateUserTraits()`

```typescript
interface UserIdentificationProfile {
  // Required: unique identifier in your system
  primaryUserId: string;                      // 'user_12345', 'cust_abc'

  // Optional: traits for segmentation
  userTraitsAndAttributes: {
    accountType?: 'free' | 'premium' | 'enterprise';
    companyName?: string;
    companySizeEmployees?: number;
    industry?: string;
    country?: string;
    signupDate?: string;
    lastLoginDate?: string;
    totalSpentAmount?: number;
    customAttribute?: any;
  };

  // Optional: contact info
  emailAddressForUser?: string;               // 'user@example.com'
  phoneNumberForUser?: string;                // '+1234567890'

  // Timestamps
  profileCreationTimestamp: number;           // When created
  lastActivityTimestamp: number;              // Last event time
}
```

### EventPropertiesData

Custom properties attached to an event.

**What**: Key-value pairs providing event context
**Why**: Enable filtering, segmentation, and funnel analysis
**When**: Include relevant details about the event
**How**: Pass as second argument to `recordAnalyticsEvent()`

```typescript
// Good examples:

// E-commerce event
{
  orderId: 'order_12345',
  productId: 'prod_abc',
  productName: 'Premium Widget',
  quantity: 2,
  pricePerUnit: 29.99,
  discount: 5.00,
  totalAmount: 54.98,
  paymentMethod: 'credit_card',
  shippingCountry: 'US'
}

// Finance event
{
  ticker: 'AAPL',
  action: 'buy',
  quantity: 100,
  pricePerShare: 150.25,
  totalValue: 15025.00,
  accountType: 'margin',
  exchange: 'NASDAQ'
}

// Social media event
{
  postId: 'post_xyz',
  contentType: 'image',
  visibility: 'public',
  likesCount: 42,
  commentsCount: 8,
  sharesCount: 3,
  hashTags: ['tech', 'startup']
}

// Bad examples (avoid):
{
  data: '{"whatever": "..."}',    // Too vague
  json: '...',                     // Unclear
  value: 123,                      // Too generic, what value?
  temp: true                       // Temporary fields
}
```

---

## 5. Configuration

### Minimal Configuration

```typescript
const sdkClient = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-ABC123XYZ'
    }
  }
});
```

### Complete Configuration

```typescript
const sdkClient = new UserMeshAnalyticsSdkClient({
  // Which platforms to send events to
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-ABC123XYZ',        // Get from GA4 property
      measurementIdentifier?: 'G-MEASUREMENT123'      // Optional measurement ID
    },
    postHogPlatform: {
      isEnabled: true,
      projectApiKey: 'phc_abc123xyz...',              // Get from PostHog project
      customHostUrl?: 'https://custom.posthog.com'    // Optional for self-hosted
    },
    mixpanelPlatform: {
      isEnabled: true,
      projectToken: 'abc123def456...'                 // Get from Mixpanel token
    },
    microsoftClarity: {
      isEnabled: true,
      projectIdentifier: 'abc123xyz'                  // Get from Clarity settings
    },
    customAnalyticsEndpoint: {
      isEnabled: true,
      endpointUrl: 'https://api.example.com/analytics',
      authenticationHeader?: 'Bearer token...'        // If needed
    }
  },

  // How to batch and flush events
  sdkBehaviorConfiguration: {
    maximumQueuedEventsBeforeFlushing: 20,            // Flush when queue reaches 20 events
    flushIntervalMilliseconds: 5000,                  // Or every 5 seconds
    maximumOfflineQueueCapacity: 1000,                // Max 1000 events offline
    enableDetailedDebugLogging: true,                 // Log everything (dev only!)
    operatingMode: 'development',                     // 'development' or 'production'
    enableAnalyticsTracking: true                     // Respect user opt-outs
  },

  // Security and privacy
  securityAndPrivacyConfiguration: {
    enableDataEncryption: true,                       // Encrypt at rest
    encryptionKeyMaterial: 'base64-encoded-32-bytes', // Your encryption key
    shouldRedactPersonalInformation: false,           // Redact PII
    dataRetentionDaysCount: 30                        // Delete old events
  }
});
```

### How to Get Platform Credentials

**Google Analytics 4:**
1. Go to GA4 property settings
2. Find "Property ID" (looks like G-XXXXXXXXXX)
3. Copy into `googlePropertyIdentifier`

**PostHog:**
1. Go to PostHog project settings
2. Find "Project API Key"
3. Copy into `projectApiKey`

**Mixpanel:**
1. Go to Mixpanel project settings
2. Find "Token"
3. Copy into `projectToken`

**Microsoft Clarity:**
1. Go to Clarity project settings
2. Find "Project ID"
3. Copy into `projectIdentifier`

---

## 6. Event Tracking

### Basic Event Tracking

```typescript
// Simplest case - event name only
await sdk.recordAnalyticsEvent('button_clicked');

// With properties
await sdk.recordAnalyticsEvent('search_performed', {
  query: 'winter jackets',
  resultsCount: 42,
  filterApplied: 'price:0-100'
});

// With options
await sdk.recordAnalyticsEvent('product_viewed', {
  productId: 'prod_123',
  productName: 'Awesome Widget'
}, {
  includeDeviceContext: true,
  includeSessionContext: true
});
```

### Event Naming Conventions

Events should use lowercase with underscores, describing what happened.

```typescript
// Good event names
'user_signup'               // What happened: user signed up
'purchase_completed'        // What happened: purchase completed
'button_clicked'            // What happened: button clicked
'page_viewed'              // What happened: page viewed
'error_occurred'           // What happened: error occurred

// Bad event names
'userSignup'               // Not lowercase
'User Signup'              // Not lowercase with underscores
'event123'                 // Not descriptive
's'                        // Too short/vague
'user_did_sign_up'         // Too verbose
'on_signup_button_press'   // Too specific to implementation
```

### Property Naming Conventions

Properties should be lowercase with underscores, specific, and relevant.

```typescript
// Good property names
'product_id'               // What: product identifier
'product_name'             // What: product name
'purchase_amount'          // What: amount spent
'payment_method'           // What: how they paid
'time_spent_seconds'       // What: duration in seconds

// Bad property names
'productId'                // Not snake_case
'prod'                     // Too abbreviated
'data'                     // Too vague
'x'                        // Meaningless
'some_random_field'        // Not relevant to event
```

### Common Event Types

```typescript
// User lifecycle events
await sdk.recordAnalyticsEvent('user_signup', { signupMethod: 'email' });
await sdk.recordAnalyticsEvent('user_login', { loginMethod: 'google' });
await sdk.recordAnalyticsEvent('user_logout', {});

// Page/screen events
await sdk.recordAnalyticsEvent('page_viewed', { pageName: 'checkout', pageUrl: '/checkout' });
await sdk.recordAnalyticsEvent('page_left', { pageName: 'checkout', timeSpentSeconds: 120 });

// Commerce events
await sdk.recordAnalyticsEvent('add_to_cart', { productId: '123', price: 29.99 });
await sdk.recordAnalyticsEvent('remove_from_cart', { productId: '123' });
await sdk.recordAnalyticsEvent('checkout_started', { cartValue: 99.99, itemCount: 3 });
await sdk.recordAnalyticsEvent('purchase_completed', { orderId: '456', amount: 99.99 });

// Engagement events
await sdk.recordAnalyticsEvent('button_clicked', { buttonName: 'subscribe' });
await sdk.recordAnalyticsEvent('form_submitted', { formName: 'newsletter' });
await sdk.recordAnalyticsEvent('video_played', { videoId: 'xyz', duration: 180 });

// Error events
await sdk.recordAnalyticsEvent('error_occurred', { 
  errorType: 'payment_failed',
  errorMessage: 'Card declined'
});
```

---

## 7. User Identification

### Identifying Users

```typescript
// When user logs in
await sdk.identifyCurrentUser('user_12345', {
  email: 'user@example.com',
  name: 'John Doe',
  accountType: 'premium',
  signupDate: '2024-01-15'
});

// Now all events are associated with user_12345
await sdk.recordAnalyticsEvent('feature_used', { feature: 'export' });
// This event is now linked to user_12345 in all platforms
```

### Updating User Traits

```typescript
// User upgrades their account
await sdk.updateUserTraits({
  accountType: 'enterprise',
  additionalSeats: 10
});

// Now events will include new traits
await sdk.recordAnalyticsEvent('report_generated', { reportType: 'monthly' });
// This event shows the user as 'enterprise' plan
```

### Clearing User Data

```typescript
// User logs out
await sdk.clearCurrentUserProfile();

// Events now tracked as anonymous
await sdk.recordAnalyticsEvent('page_viewed', { page: 'home' });
// This event is anonymous (not linked to user_12345)
```

### Anonymous vs Identified

```typescript
const store = useUserMeshUserProfileStore();

// Check if user is identified
if (store.isUserAuthenticated()) {
  console.log('User is logged in:', store.getAuthenticatedUserId());
} else {
  console.log('User is anonymous:', store.getAnonymousDeviceIdentifier());
}
```

---

## 8. Offline Persistence

### Automatic Offline Queue

UserMesh automatically queues events when offline and syncs when back online.

**What**: Events are stored locally and transmitted later
**Why**: Prevents data loss on unstable connections
**When**: Automatic - happens without code changes
**How**: Configured via `maximumOfflineQueueCapacity` and `dataRetentionDaysCount`

```typescript
const sdkClient = new UserMeshAnalyticsSdkClient({
  sdkBehaviorConfiguration: {
    maximumOfflineQueueCapacity: 1000,   // Store up to 1000 events offline
  },
  securityAndPrivacyConfiguration: {
    dataRetentionDaysCount: 30            // Keep for max 30 days
  }
});

// User goes offline
// Events are queued locally
await sdk.recordAnalyticsEvent('event1', {});
await sdk.recordAnalyticsEvent('event2', {});

// User comes back online
// Events automatically flushed and synced
// (happens automatically in background)
```

### Manual Flushing

```typescript
// Force immediate flush of queued events
await sdk.flushQueuedEventsToAnalyticsPlatforms();

// Useful for:
// - App shutdown/page unload
// - User requested sync
// - Before critical operation
```

### Queue Monitoring

```typescript
const queueStore = useUserMeshEventQueueStore();

// Check queue size
const queueSize = queueStore.getCurrentQueueSize();
console.log(`${queueSize} events waiting to be transmitted`);

// Get all queued events
const allEvents = queueStore.getAllQueuedEvents();
console.log(`Oldest event: ${allEvents[0]?.queuedAtTimestampMilliseconds}`);
```

---

## 9. Encryption & Security

### Why Encryption?

Sensitive user data (email, phone, traits) might be stored offline. Encryption ensures privacy if device is lost or stolen.

### Enabling Encryption

```typescript
import { UserMeshIdentifierGenerator } from '@usermesh/sdk-web';

// Generate a secure encryption key
const keyGenerator = new UserMeshIdentifierGenerator();
const encryptionKey = keyGenerator.generateRandomEncryptionKeyMaterial();

const sdkClient = new UserMeshAnalyticsSdkClient({
  securityAndPrivacyConfiguration: {
    enableDataEncryption: true,
    encryptionKeyMaterial: encryptionKey  // Store this securely!
  }
});

// NOW: All offline data is encrypted with AES-256-GCM
await sdk.recordAnalyticsEvent('user_data', { 
  email: 'user@example.com'  // Encrypted at rest
});
```

### Where Encryption Happens

1. **Events at Rest**: When stored offline (localStorage/IndexedDB)
2. **User Traits at Rest**: When user profile stored offline
3. **NOT in Transit**: Use HTTPS for platform transmission (automatic)

### Storage Encryption

```typescript
// Events stored offline:
// WITHOUT encryption:
localStorage.getItem('usermesh_event_xyz')
// Returns: {"email":"user@example.com","amount":99.99,...}

// WITH encryption:
localStorage.getItem('usermesh_event_xyz')
// Returns: "aGVsbG8gd29ybGQgdGhpcyBpcyBlbmNyeXB0ZWQ..." (unreadable)
```

### Key Management

```typescript
// Generate key (run once, save securely)
const generator = new UserMeshIdentifierGenerator();
const newKey = generator.generateRandomEncryptionKeyMaterial();
console.log(newKey);  // Save to your secure config storage

// Use saved key (on app startup)
const sdkClient = new UserMeshAnalyticsSdkClient({
  securityAndPrivacyConfiguration: {
    enableDataEncryption: true,
    encryptionKeyMaterial: process.env.USERMESH_ENCRYPTION_KEY
  }
});
```

---

## 10. Advanced Usage

### Custom Event Validation

```typescript
import { useUserMeshEventQueueStore } from '@usermesh/sdk-web';

// Extend validation for your domain
const store = useUserMeshEventQueueStore();

// Validate before queueing
const eventValidator = new UserMeshEventValidator();
const customRule = {
  ruleIdentifier: 'finance_event_has_ticker',
  ruleDescription: 'Finance events must have ticker symbol',
  performValidationCheck: (event) => {
    if (event.analyticsEventName.includes('trade')) {
      return event.eventPropertiesData.ticker !== undefined;
    }
    return true;
  },
  failureErrorMessage: 'Trade events require ticker symbol',
  isValidationRuleCritical: true
};

eventValidator.addCustomValidationRule(customRule);
```

### Multiple Platform Configuration

```typescript
const sdkClient = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    // Send to all platforms
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-ABC123'
    },
    postHogPlatform: {
      isEnabled: true,
      projectApiKey: 'phc_abc123'
    },
    mixpanelPlatform: {
      isEnabled: true,
      projectToken: 'token123'
    },
    microsoftClarity: {
      isEnabled: true,
      projectIdentifier: 'clarity123'
    },
    // Plus custom webhook
    customAnalyticsEndpoint: {
      isEnabled: true,
      endpointUrl: 'https://api.example.com/events',
      authenticationHeader: 'Bearer your_token'
    }
  }
});

// One event, all platforms
await sdk.recordAnalyticsEvent('user_signup', { method: 'email' });
// Automatically sent to: GA4, PostHog, Mixpanel, Clarity, Custom API
```

### Privacy Compliance

```typescript
const sdkClient = new UserMeshAnalyticsSdkClient({
  securityAndPrivacyConfiguration: {
    // GDPR: Delete events after retention period
    dataRetentionDaysCount: 30,

    // GDPR: Redact personal information
    shouldRedactPersonalInformation: true,

    // CCPA: Respect Do Not Track header (automatic)
    // If user has DNT header, tracking is disabled
  }
});

// User requests data deletion
await sdk.disableAnalyticsTrackingCompletely();
// All future events won't be sent, offline queue is cleared

// User opts back in
await sdk.enableAnalyticsTrackingAgain();
// Tracking resumes
```

### Environment-Specific Configuration

```typescript
// Development: detailed logging, small batches
if (process.env.NODE_ENV === 'development') {
  const sdkClient = new UserMeshAnalyticsSdkClient({
    sdkBehaviorConfiguration: {
      enableDetailedDebugLogging: true,
      maximumQueuedEventsBeforeFlushing: 1,  // Flush immediately
      flushIntervalMilliseconds: 1000        // Every second
    }
  });
}

// Production: minimal logging, efficient batching
if (process.env.NODE_ENV === 'production') {
  const sdkClient = new UserMeshAnalyticsSdkClient({
    sdkBehaviorConfiguration: {
      enableDetailedDebugLogging: false,
      maximumQueuedEventsBeforeFlushing: 50, // Batch more events
      flushIntervalMilliseconds: 30000       // Every 30 seconds
    }
  });
}
```

---

## 11. Troubleshooting

### Events Not Appearing in Dashboard

**Problem**: Events tracked but not showing in GA4/PostHog/etc

**Why**: Multiple possible causes

**How to Debug**:
1. Enable debug logging
   ```typescript
   sdkBehaviorConfiguration: {
     enableDetailedDebugLogging: true
   }
   ```

2. Check browser console for errors
   ```
   [UserMesh] Flushing 5 events to Google Analytics 4...
   [UserMesh] Successfully transmitted batch_xyz to GA4
   ```

3. Verify credentials are correct
   ```typescript
   // Wrong: Missing 'G-' prefix
   googlePropertyIdentifier: 'ABC123'  // WRONG
   
   // Right: Has 'G-' prefix
   googlePropertyIdentifier: 'G-ABC123'  // RIGHT
   ```

4. Check network tab in browser DevTools
   - Look for requests to platform APIs
   - Verify they return 200 (success) status

### High Memory Usage

**Problem**: SDK consuming too much memory

**Why**: Queue size too large or events not flushing

**How to Fix**:
```typescript
sdkBehaviorConfiguration: {
  maximumQueuedEventsBeforeFlushing: 20,  // Lower from default 100
  flushIntervalMilliseconds: 5000,        // Flush more frequently
  maximumOfflineQueueCapacity: 500        // Cap offline storage
}
```

### Events Lost on Page Reload

**Problem**: Events lost when user refreshes page

**Why**: Events not persisted offline

**How to Fix**:
```typescript
sdkBehaviorConfiguration: {
  maximumOfflineQueueCapacity: 1000  // Enable offline persistence
}
```

### Slow Event Transmission

**Problem**: Events taking too long to send

**Why**: Network latency or platform latency

**How to Debug**:
1. Check network speed in DevTools
2. Monitor platform API response times
3. Increase batch size (fewer API calls)
   ```typescript
   maximumQueuedEventsBeforeFlushing: 50  // Batch more events
   ```

### Encryption Key Issues

**Problem**: Can't decrypt events, or encryption failing

**Why**: Key too short, wrong encoding, or key changed

**How to Fix**:
```typescript
// Key must be exactly 32 bytes when decoded from base64
const keyGenerator = new UserMeshIdentifierGenerator();
const validKey = keyGenerator.generateRandomEncryptionKeyMaterial();
// This generates the correct format automatically
```

### Configuration Validation Errors

**Problem**: "Configuration is invalid" error on startup

**Why**: Missing credentials or invalid values

**How to Fix**:
1. Enable at least one platform
   ```typescript
   analyticsIntegrations: {
     googleAnalytics4: { isEnabled: true, googlePropertyIdentifier: 'G-ABC' }
   }
   ```

2. Verify credential format
   - GA4: Starts with 'G-', alphanumeric
   - PostHog: 20+ characters
   - Mixpanel: 32-character hex string
   - Clarity: Alphanumeric

3. Check for typos
   ```typescript
   // Common mistake: wrong field name
   analyticsIntegrations: {
     googleAnalytics4: {
       isEnabled: true,
       googlePropertyID: '...'     // WRONG
       googlePropertyIdentifier: '...'  // RIGHT
     }
   }
   ```

---

## Summary

UserMesh makes analytics simple, developer-friendly, and powerful:

1. **One SDK, Multiple Platforms** - No need for separate integrations
2. **Type-Safe** - Catch errors at compile time
3. **Developer-Friendly** - Clear names, comprehensive comments
4. **Offline-First** - Works without network connectivity
5. **Secure** - Encryption at rest, privacy by default
6. **Flexible** - Support for any domain and event type

Get started with minimal configuration, scale to advanced features as needed.

For more information, see the API Reference and example implementations.
