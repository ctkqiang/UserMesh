# UserMesh API Reference

Author: 钟智强  
Email: ctkqiang@dingtalk.com  
Repository: https://gitcode.com/ctkqiang_sr/UserMesh.git

Complete API documentation for the UserMesh SDK.

## Table of Contents

1. UserMeshAnalyticsSdkClient
2. Configuration Types
3. Event Types
4. State Management (Zustand Hooks)
5. Utility Classes
6. Validation & Encryption

---

## 1. UserMeshAnalyticsSdkClient

Main SDK class for tracking events and managing analytics.

### Constructor

```typescript
new UserMeshAnalyticsSdkClient(configuration: UserMeshSdkConfiguration)
```

**Parameters:**
- `configuration`: Complete SDK configuration object

**Returns:** SDK client instance

**Throws:** `UserMeshSdkConfigurationError` if configuration is invalid

**Example:**
```typescript
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

const sdkClient = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-ABC123XYZ'
    }
  }
});
```

### initializeUserMeshAnalyticsSdk()

Initialize the SDK and prepare for event tracking.

```typescript
async initializeUserMeshAnalyticsSdk(): Promise<void>
```

**What:** Sets up offline queue, initializes platform connectors, starts automatic flushing

**Why:** Must be called before any tracking operations

**When:** Call once at application startup, before any events are tracked

**How:** Awaited async call, returns when initialization complete

**Throws:** Error if initialization fails (e.g., bad credentials)

**Example:**
```typescript
const sdkClient = new UserMeshAnalyticsSdkClient(config);

try {
  await sdkClient.initializeUserMeshAnalyticsSdk();
  console.log('SDK initialized successfully');
} catch (error) {
  console.error('SDK initialization failed:', error);
}
```

### recordAnalyticsEvent()

Track an event that occurred in the application.

```typescript
async recordAnalyticsEvent(
  analyticsEventName: string,
  eventPropertiesData?: Record<string, unknown>,
  optionalTrackingParameters?: {
    includeDeviceContext?: boolean;
    includeSessionContext?: boolean;
  }
): Promise<void>
```

**Parameters:**
- `analyticsEventName`: Event name (lowercase_with_underscores, 1-64 chars)
- `eventPropertiesData`: Optional properties providing event context
- `optionalTrackingParameters`: Optional override flags

**What:** Records and queues an event for transmission to analytics platforms

**Why:** Primary method for analytics data collection

**When:** Call whenever something noteworthy happens

**How:** Async call that validates, enriches, and queues the event

**Returns:** Promise resolving when event is queued (not when transmitted)

**Throws:** Error if event name is invalid

**Example:**
```typescript
// Basic event
await sdk.recordAnalyticsEvent('user_signup');

// Event with properties
await sdk.recordAnalyticsEvent('purchase_completed', {
  orderId: 'order_12345',
  amount: 99.99,
  paymentMethod: 'credit_card'
});

// With context options
await sdk.recordAnalyticsEvent('page_viewed', 
  { pageName: 'checkout' },
  { 
    includeDeviceContext: true,
    includeSessionContext: true
  }
);
```

### identifyCurrentUser()

Identify the currently authenticated user.

```typescript
async identifyCurrentUser(
  authenticatedUserId: string,
  userTraitsAndAttributes: Record<string, unknown>
): Promise<void>
```

**Parameters:**
- `authenticatedUserId`: Unique user ID in your system
- `userTraitsAndAttributes`: User traits for segmentation

**What:** Links future events to a specific authenticated user

**Why:** Enables user-level analytics and segmentation

**When:** Call when user logs in or authenticates

**How:** Updates internal user state and enriches all future events

**Returns:** Promise resolving when user is identified

**Throws:** Error if user ID is empty or invalid

**Example:**
```typescript
await sdk.identifyCurrentUser('user_12345', {
  email: 'user@example.com',
  accountType: 'premium',
  companyName: 'Acme Corp',
  signupDate: '2024-01-15'
});

// All future events now include user context
await sdk.recordAnalyticsEvent('feature_used', { feature: 'export' });
// This event is linked to user_12345
```

### updateUserTraits()

Update user traits without re-identifying.

```typescript
async updateUserTraits(newTraits: Record<string, unknown>): Promise<void>
```

**Parameters:**
- `newTraits`: New or updated trait values

**What:** Updates current user's traits/attributes

**Why:** Reflect user profile changes (upgrade, settings change, etc.)

**When:** Call when user traits change

**How:** Merges new traits with existing traits

**Returns:** Promise resolving when update complete

**Example:**
```typescript
// User upgrades to premium
await sdk.updateUserTraits({
  accountType: 'premium',
  upgradeDate: '2024-02-15'
});

// User adds company info
await sdk.updateUserTraits({
  companyName: 'New Corp',
  companySize: 50
});
```

### trackPageView()

Track a page or screen view.

```typescript
async trackPageView(
  pageOrScreenName: string,
  pagePropertiesData?: Record<string, unknown>
): Promise<void>
```

**Parameters:**
- `pageOrScreenName`: Page or screen identifier
- `pagePropertiesData`: Optional page-specific properties

**What:** Records a page view or screen view event

**Why:** Enables page/screen analysis and funnel tracking

**When:** Call when user navigates to a page

**How:** Creates a 'page_viewed' event with page context

**Returns:** Promise resolving when event is queued

**Example:**
```typescript
// Basic page view
await sdk.trackPageView('checkout');

// Page view with properties
await sdk.trackPageView('product_detail', {
  productId: 'prod_123',
  productName: 'Widget',
  category: 'electronics'
});
```

### reportErrorOccurrence()

Track an error that occurred in the application.

```typescript
async reportErrorOccurrence(
  error: Error | string,
  errorContext?: Record<string, unknown>
): Promise<void>
```

**Parameters:**
- `error`: Error object or error message string
- `errorContext`: Additional context about the error

**What:** Records an error event for debugging

**Why:** Identify and track application errors

**When:** Call in error handlers or catch blocks

**How:** Extracts error details and queues error event

**Returns:** Promise resolving when error is logged

**Example:**
```typescript
try {
  await processPayment();
} catch (error) {
  await sdk.reportErrorOccurrence(error, {
    context: 'payment_processing',
    userId: 'user_123',
    orderValue: 99.99
  });
}
```

### flushQueuedEventsToAnalyticsPlatforms()

Manually flush all queued events to analytics platforms.

```typescript
async flushQueuedEventsToAnalyticsPlatforms(): Promise<void>
```

**What:** Immediately sends all queued events to platforms

**Why:** Ensure events are sent before app shutdown or critical operations

**When:** Before page unload, app termination, or when needed

**How:** Batches events and transmits to all enabled platforms

**Returns:** Promise resolving when flush complete

**Note:** Automatic flushing happens on interval/threshold, but manual flush is useful for:
- App shutdown (window.beforeunload)
- User requested sync
- Before critical operations
- Testing

**Example:**
```typescript
// On page unload
window.addEventListener('beforeunload', async () => {
  await sdk.flushQueuedEventsToAnalyticsPlatforms();
});

// Manual sync button
async function syncAnalyticsNow() {
  await sdk.flushQueuedEventsToAnalyticsPlatforms();
  console.log('Events synced!');
}
```

### disableAnalyticsTrackingCompletely()

Disable all analytics tracking (respects user privacy).

```typescript
async disableAnalyticsTrackingCompletely(): Promise<void>
```

**What:** Stops all event tracking and clears queued events

**Why:** Respect user's "Do Not Track" preference or privacy requests

**When:** When user opts out of tracking

**How:** Sets tracking disabled flag and clears offline queue

**Returns:** Promise resolving when tracking is disabled

**Example:**
```typescript
// User unchecks "Allow Analytics"
await sdk.disableAnalyticsTrackingCompletely();

// These events will NOT be tracked
await sdk.recordAnalyticsEvent('button_clicked', {});
```

### enableAnalyticsTrackingAgain()

Re-enable analytics tracking.

```typescript
async enableAnalyticsTrackingAgain(): Promise<void>
```

**What:** Resume analytics tracking after being disabled

**Why:** User changed privacy preferences

**When:** When user opts back in

**How:** Clears disabled flag and resumes tracking

**Returns:** Promise resolving when tracking is enabled

**Example:**
```typescript
// User rechecks "Allow Analytics"
await sdk.enableAnalyticsTrackingAgain();

// These events WILL be tracked again
await sdk.recordAnalyticsEvent('button_clicked', {});
```

### destroyUserMeshSdkAndCleanup()

Shutdown the SDK gracefully.

```typescript
async destroyUserMeshSdkAndCleanup(): Promise<void>
```

**What:** Cleanup SDK resources and flush remaining events

**Why:** Proper shutdown before app termination

**When:** Before application exit/unload

**How:** Flushes queued events, closes connections, frees resources

**Returns:** Promise resolving when shutdown complete

**Example:**
```typescript
// App is shutting down
window.addEventListener('unload', async () => {
  await sdk.destroyUserMeshSdkAndCleanup();
});
```

### clearCurrentUserProfile()

Clear the current user profile (on logout).

```typescript
async clearCurrentUserProfile(): Promise<void>
```

**What:** Removes identification and resumes anonymous tracking

**Why:** User logged out

**When:** On user logout

**How:** Clears user state, future events are anonymous

**Returns:** Promise resolving when cleared

**Example:**
```typescript
// User logs out
await sdk.clearCurrentUserProfile();

// Events now anonymous again
await sdk.recordAnalyticsEvent('page_viewed', { page: 'home' });
```

---

## 2. Configuration Types

### UserMeshSdkConfiguration

Complete SDK configuration object.

```typescript
interface UserMeshSdkConfiguration {
  analyticsIntegrations: {
    googleAnalytics4?: GoogleAnalytics4IntegrationConfiguration;
    postHogPlatform?: PostHogAnalyticsIntegrationConfiguration;
    mixpanelPlatform?: MixpanelAnalyticsIntegrationConfiguration;
    microsoftClarity?: MicrosoftClarityIntegrationConfiguration;
    customAnalyticsEndpoint?: CustomAnalyticsEndpointConfiguration;
  };

  sdkBehaviorConfiguration?: SdkRuntimeBehaviorConfiguration;
  securityAndPrivacyConfiguration?: DataSecurityAndPrivacyConfiguration;
}
```

### GoogleAnalytics4IntegrationConfiguration

```typescript
interface GoogleAnalytics4IntegrationConfiguration {
  isEnabled: boolean;
  googlePropertyIdentifier: string;        // e.g., "G-ABC123XYZ"
  measurementIdentifier?: string;          // Optional measurement ID
}
```

**How to Get:**
1. Go to GA4 property settings
2. Find "Property ID"
3. Copy (looks like G-XXXXXXXXXX)

### PostHogAnalyticsIntegrationConfiguration

```typescript
interface PostHogAnalyticsIntegrationConfiguration {
  isEnabled: boolean;
  projectApiKey: string;                   // From project settings
  customHostUrl?: string;                  // For self-hosted PostHog
}
```

**How to Get:**
1. Go to PostHog project settings
2. Find "Project API Key"
3. Copy

### MixpanelAnalyticsIntegrationConfiguration

```typescript
interface MixpanelAnalyticsIntegrationConfiguration {
  isEnabled: boolean;
  projectToken: string;                    // From project settings
}
```

**How to Get:**
1. Go to Mixpanel project settings
2. Find "Token"
3. Copy

### MicrosoftClarityIntegrationConfiguration

```typescript
interface MicrosoftClarityIntegrationConfiguration {
  isEnabled: boolean;
  projectIdentifier: string;               // From Clarity settings
}
```

**How to Get:**
1. Go to Clarity project settings
2. Find "Project ID"
3. Copy

### CustomAnalyticsEndpointConfiguration

```typescript
interface CustomAnalyticsEndpointConfiguration {
  isEnabled: boolean;
  endpointUrl: string;                     // Your webhook URL
  authenticationHeader?: string;           // Optional auth token
}
```

**Example:**
```typescript
customAnalyticsEndpoint: {
  isEnabled: true,
  endpointUrl: 'https://api.example.com/events',
  authenticationHeader: 'Bearer your_token_here'
}
```

### SdkRuntimeBehaviorConfiguration

```typescript
interface SdkRuntimeBehaviorConfiguration {
  maximumQueuedEventsBeforeFlushing?: number;        // Default: 20
  flushIntervalMilliseconds?: number;                // Default: 5000
  maximumOfflineQueueCapacity?: number;              // Default: 1000
  enableDetailedDebugLogging?: boolean;              // Default: false
  operatingMode?: 'development' | 'production';      // Default: 'production'
  enableAnalyticsTracking?: boolean;                 // Default: true
}
```

**Typical Values:**

Development:
```typescript
{
  maximumQueuedEventsBeforeFlushing: 1,      // Flush every event
  flushIntervalMilliseconds: 1000,           // Every second
  enableDetailedDebugLogging: true           // See everything
}
```

Production:
```typescript
{
  maximumQueuedEventsBeforeFlushing: 50,     // Batch events
  flushIntervalMilliseconds: 30000,          // Every 30 seconds
  enableDetailedDebugLogging: false          // Minimal logs
}
```

### DataSecurityAndPrivacyConfiguration

```typescript
interface DataSecurityAndPrivacyConfiguration {
  enableDataEncryption?: boolean;            // Default: false
  encryptionKeyMaterial?: string;            // 32-byte base64 key
  shouldRedactPersonalInformation?: boolean; // Default: false
  dataRetentionDaysCount?: number;           // Default: 30
}
```

**Encryption:**
```typescript
securityAndPrivacyConfiguration: {
  enableDataEncryption: true,
  encryptionKeyMaterial: 'base64_encoded_32_byte_key'
}
```

**Privacy:**
```typescript
securityAndPrivacyConfiguration: {
  shouldRedactPersonalInformation: true,     // Hide emails, phone
  dataRetentionDaysCount: 30                 // Delete after 30 days
}
```

---

## 3. Event Types

### AnalyticsEventRecord

Complete event structure.

```typescript
interface AnalyticsEventRecord {
  uniqueEventIdentifier: string;
  eventTimestampMilliseconds: number;
  analyticsEventName: string;
  authenticatedUserId?: string;
  anonymousSessionIdentifier?: string;
  currentSessionIdentifier: string;
  eventPropertiesData: Record<string, unknown>;
  contextInformation: EventContextInformation;
  deviceInformation?: DeviceInformationData;
  platformRoutingInstructions?: PlatformRoutingInstruction[];
}
```

### EventContextInformation

Automatically captured context.

```typescript
interface EventContextInformation {
  applicationPlatform: 'web' | 'mobile' | 'server';
  softwareDevelopmentKitVersion: string;      // SDK version
  applicationVersionString?: string;          // Your app version
  userLanguagePreference?: string;            // 'en-US'
  userTimeZoneString?: string;                // 'America/New_York'
  pageOrScreenUrl?: string;                   // Current page
  referrerOrSourceUrl?: string;               // How they arrived
}
```

### DeviceInformationData

Automatically detected device information.

```typescript
interface DeviceInformationData {
  deviceClassification: 'desktop' | 'mobile' | 'tablet';
  operatingSystemName: string;                // 'Windows', 'iOS'
  browserApplicationName?: string;            // 'Chrome'
  browserVersionNumber?: string;              // '120.0.0'
  viewportDimensions?: string;                // '1920x1080'
  deviceModelName?: string;                   // 'iPhone 15'
}
```

### UserIdentificationProfile

User profile structure.

```typescript
interface UserIdentificationProfile {
  primaryUserId: string;
  userTraitsAndAttributes: Record<string, unknown>;
  emailAddressForUser?: string;
  phoneNumberForUser?: string;
  profileCreationTimestamp: number;
  lastActivityTimestamp: number;
}
```

### EventValidationResult

Result of event validation.

```typescript
interface EventValidationResult {
  isEventValid: boolean;
  validationErrorMessages: string[];
  processedEventData?: AnalyticsEventRecord;
}
```

---

## 4. State Management (Zustand Hooks)

### useUserMeshEventQueueStore()

Zustand store for event queue state.

```typescript
const store = useUserMeshEventQueueStore();

// State properties:
store.eventQueuePendingTransmission      // Array of queued events
store.eventCountCurrentlyTransmitting    // Number being sent
store.lastQueueFlushTimestampMilliseconds // Last flush time
store.isAutomaticQueueFlushingEnabled    // Flushing enabled?

// Methods:
store.addEventToQueue(event)
store.removeEventFromQueue(eventId)
store.removeMultipleEventsFromQueue([id1, id2])
store.getAllQueuedEvents()
store.getQueuedEventByIdentifier(eventId)
store.markEventAsTransmitting(eventId)
store.markEventAsSuccessfullyTransmitted(eventId)
store.markEventAsFailedTransmission(eventId, error)
store.getCurrentQueueSize()
store.clearEntireQueue()
store.updateLastFlushTimestamp()
store.setAutomaticFlushingEnabled(boolean)
store.incrementTransmittingEventCount()
store.decrementTransmittingEventCount()
```

**Example:**
```typescript
import { useUserMeshEventQueueStore } from '@usermesh/sdk-web';

const queueStore = useUserMeshEventQueueStore();

// Check queue
const queueSize = queueStore.getCurrentQueueSize();
console.log(`${queueSize} events waiting`);

// Get all events
const allEvents = queueStore.getAllQueuedEvents();
allEvents.forEach(event => {
  console.log(`Event: ${event.eventData.analyticsEventName}`);
});
```

### useUserMeshUserProfileStore()

Zustand store for user profile state.

```typescript
const store = useUserMeshUserProfileStore();

// State properties:
store.currentAuthenticatedUserProfile
store.anonymousDeviceIdentifierForUnknownUsers
store.isUserCurrentlyAuthenticated
store.lastUserActivityTimestampMilliseconds

// Methods:
store.setAnonymousDeviceIdentifier(id)
store.setCurrentUserProfile(profile)
store.getCurrentUserProfile()
store.getAuthenticatedUserId()
store.updateUserTraits(newTraits)
store.recordUserActivity()
store.clearCurrentUserProfile()
store.isUserAuthenticated()
store.getAnonymousDeviceIdentifier()
```

**Example:**
```typescript
import { useUserMeshUserProfileStore } from '@usermesh/sdk-web';

const userStore = useUserMeshUserProfileStore();

// Check if authenticated
if (userStore.isUserAuthenticated()) {
  const userId = userStore.getAuthenticatedUserId();
  console.log(`Logged in as: ${userId}`);
} else {
  const anonId = userStore.getAnonymousDeviceIdentifier();
  console.log(`Anonymous user: ${anonId}`);
}
```

---

## 5. Utility Classes

### UserMeshIdentifierGenerator

Generate unique identifiers.

```typescript
const generator = new UserMeshIdentifierGenerator();

// Generate UUID v4
const eventId = generator.generateEventIdentifierAsUuid();
// Returns: "550e8400-e29b-41d4-a716-446655440000"

// Generate session ID (32-char hex)
const sessionId = generator.generateSessionIdentifier();
// Returns: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"

// Generate anonymous device ID
const deviceId = generator.generateAnonymousDeviceIdentifier();

// Generate encryption key (32-byte base64)
const encKey = generator.generateRandomEncryptionKeyMaterial();
// Returns: "aGVsbG8gd29ybGQgdGhpcyBpcyBhIHRlc3Qg..."

// Generate security token
const token = generator.generateRandomSecurityToken(32);
```

### UserMeshDataEncryptionService

Encrypt and decrypt data.

```typescript
const encryption = new UserMeshDataEncryptionService({
  isEncryptionEnabled: true,
  encryptionKeyMaterial: 'your_base64_key'
});

// Encrypt
const result = await encryption.encryptEventDataBeforePersistence(
  JSON.stringify(event)
);
if (result.wasEncryptionSuccessful) {
  console.log('Encrypted:', result.encryptedDataBase64);
}

// Decrypt
const decrypted = await encryption.decryptPersistedEventData(
  result.encryptedDataBase64
);
if (decrypted.wasDecryptionSuccessful) {
  console.log('Decrypted:', decrypted.decryptedPlaintextData);
}
```

### UserMeshEventValidator

Validate events and add custom rules.

```typescript
const validator = new UserMeshEventValidator(strictMode = true);

// Validate event
const result = validator.validateAnalyticsEventRecord(event);
if (!result.isEventValid) {
  console.error('Invalid event:', result.validationErrorMessages);
}

// Add custom rule
validator.addCustomValidationRule({
  ruleIdentifier: 'custom_rule',
  ruleDescription: 'My custom validation',
  performValidationCheck: (event) => {
    // Return true if valid, false if invalid
    return event.eventPropertiesData.customField !== undefined;
  },
  failureErrorMessage: 'Custom field is required',
  isValidationRuleCritical: true
});
```

### UserMeshConfigurationValidator

Validate SDK configuration.

```typescript
const configValidator = new UserMeshConfigurationValidator();

const result = configValidator.validateUserMeshSdkConfiguration(config);
if (!result.isConfigurationValid) {
  console.error('Config errors:', result.validationErrorMessages);
  console.warn('Warnings:', result.validationWarningMessages);
} else {
  console.log('Configuration is valid!');
}
```

---

## Error Handling

### Common Errors

**Configuration Error:**
```
UserMeshSdkConfigurationError: The required configuration key 
"googlePropertyIdentifier" was not provided.
```

**Validation Error:**
```
Event validation failed: analyticsEventName must be 1-64 lowercase 
characters and underscores only
```

**Encryption Error:**
```
Failed to encrypt event data: encryption service not initialized
```

### Handling Errors

```typescript
try {
  await sdk.recordAnalyticsEvent('user_signup', {
    method: 'email'
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Event validation failed:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## Best Practices

1. **Initialize once, reuse instance**
   ```typescript
   // DO
   const sdk = new UserMeshAnalyticsSdkClient(config);
   await sdk.initializeUserMeshAnalyticsSdk();
   export { sdk };

   // DON'T
   for (let i = 0; i < 100; i++) {
     const sdk = new UserMeshAnalyticsSdkClient(config);
     await sdk.recordAnalyticsEvent('event', {});
   }
   ```

2. **Use snake_case for event names and properties**
   ```typescript
   // DO
   await sdk.recordAnalyticsEvent('user_signup', { plan_type: 'premium' });

   // DON'T
   await sdk.recordAnalyticsEvent('userSignup', { planType: 'premium' });
   ```

3. **Flush before shutdown**
   ```typescript
   window.addEventListener('beforeunload', async () => {
     await sdk.flushQueuedEventsToAnalyticsPlatforms();
   });
   ```

4. **Enable encryption for sensitive data**
   ```typescript
   securityAndPrivacyConfiguration: {
     enableDataEncryption: true,
     encryptionKeyMaterial: process.env.ENCRYPTION_KEY
   }
   ```

5. **Validate configuration early**
   ```typescript
   const configValidator = new UserMeshConfigurationValidator();
   const validation = configValidator.validateUserMeshSdkConfiguration(config);
   if (!validation.isConfigurationValid) {
     throw new Error(validation.validationErrorMessages.join(', '));
   }
   ```

---

## Summary

UserMesh SDK provides a complete, type-safe analytics solution:

- **recordAnalyticsEvent()** - Track events
- **identifyCurrentUser()** - Identify users
- **trackPageView()** - Track page views
- **flushQueuedEventsToAnalyticsPlatforms()** - Manual flush
- **State stores** - Query queue and user state
- **Utilities** - Generate IDs, validate, encrypt

See DEVELOPER_GUIDE.md for conceptual overview and examples.
