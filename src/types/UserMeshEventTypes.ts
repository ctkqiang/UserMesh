/**
 * Core type definitions for UserMesh analytics events.
 *
 * These types define the structure of all analytics events that flow through the UserMesh SDK.
 * Every event, regardless of domain (finance, social, e-commerce) or destination platform
 * (GA4, PostHog, Mixpanel, Clarity), follows these core structures.
 *
 * Why: Type safety ensures consistency across all integrations and platforms.
 * When: Used whenever creating, validating, or transmitting analytics events.
 */

/**
 * Represents a single analytics event that occurred in the application.
 *
 * This is the canonical event format within UserMesh. All domain-specific events
 * (stock trades, social media posts, purchases) are normalized to this structure
 * before being sent to analytics platforms.
 *
 * Why: Having a single event format allows UserMesh to support multiple platforms
 * and domains without changing core event handling logic.
 */
export interface AnalyticsEventRecord {
  /**
   * Globally unique identifier for this specific event instance.
   * Generated as UUID v4 to guarantee uniqueness across all time and systems.
   */
  uniqueEventIdentifier: string;

  /**
   * Timestamp when this event occurred, in milliseconds since Unix epoch.
   * Used for time-series analysis and event ordering.
   */
  eventTimestampMilliseconds: number;

  /**
   * The name of the event that occurred (e.g., "user_signup", "stock_traded", "post_liked").
   * Should be lowercase with underscores. Must be the same across all platforms
   * for accurate cross-platform analysis.
   */
  analyticsEventName: string;

  /**
   * Identifier for an authenticated user. Present if the user is logged in.
   * This allows tracking behavior across sessions and devices for the same user.
   */
  authenticatedUserId?: string;

  /**
   * Anonymous identifier for unidentified devices/browsers (e.g., via cookies or local storage).
   * Used before user authentication or for users who never sign up.
   */
  anonymousSessionIdentifier?: string;

  /**
   * Identifier for the current browsing/application session.
   * A session typically lasts 30 minutes of inactivity. Used to group related
   * events that happen during a single user interaction period.
   */
  currentSessionIdentifier: string;

  /**
   * Domain-specific and event-specific properties.
   *
   * Examples:
   * - For stock_traded event: { symbol: "AAPL", quantity: 100, price: 150.25 }
   * - For post_liked event: { postId: "123", authorId: "456" }
   * - For purchase_completed event: { orderId: "abc", totalValue: 99.99 }
   *
   * Properties should be JSON-serializable. Avoid storing complex objects or
   * functions. All values will be validated and sanitized before transmission.
   */
  eventPropertiesData: Record<string, unknown>;

  /**
   * Contextual information about where and when this event occurred.
   * Automatically captured by the SDK and should not be manually overridden.
   */
  contextInformation: EventContextInformation;

  /**
   * Information about the device/browser where the event occurred.
   * Only populated for web/mobile platforms. Server-side events will have this as undefined.
   */
  deviceInformation?: DeviceInformationData;

  /**
   * Metadata about which analytics platforms should receive this event.
   * Set by the SDK based on configuration. Used internally for routing.
   */
  platformRoutingInstructions?: PlatformRoutingInstruction[];
}

/**
 * Context about the application environment where the event occurred.
 * This is automatically captured and should not be manually overridden.
 */
export interface EventContextInformation {
  /**
   * The platform where the application is running.
   * - "web": Browser-based application
   * - "mobile": Native mobile app or React Native
   * - "server": Node.js or backend server
   */
  applicationPlatform: 'web' | 'mobile' | 'server';

  /**
   * The version of the UserMesh SDK that generated this event.
   * Format: "1.0.0". Used to identify which SDK version has issues.
   */
  softwareDevelopmentKitVersion: string;

  /**
   * The version of the application using UserMesh (e.g., app's version number).
   * Useful for correlating analytics changes with app releases.
   */
  applicationVersionString?: string;

  /**
   * The user's preferred language (e.g., "en-US", "fr-FR").
   * Automatically detected from browser/device settings.
   */
  userLanguagePreference?: string;

  /**
   * The user's timezone (e.g., "America/New_York").
   * Helps convert timestamps to user's local time for analysis.
   */
  userTimeZoneString?: string;

  /**
   * The full URL of the page/screen where the event occurred (for web only).
   * Useful for identifying which page/feature triggered the event.
   */
  pageOrScreenUrl?: string;

  /**
   * The referrer URL (how the user arrived at this page/app).
   * Used for attribution analysis (where did traffic come from?).
   */
  referrerOrSourceUrl?: string;

  /**
   * ISO 8601 timestamp when the SDK was initialized.
   * Used to calculate session duration and identify initialization issues.
   */
  sdkInitializationTimestamp?: string;
}

/**
 * Information about the device or browser where the event occurred.
 * Automatically detected from the user agent string and screen dimensions.
 */
export interface DeviceInformationData {
  /**
   * Type of device.
   * - "desktop": Traditional computer (laptop, desktop)
   * - "mobile": Smartphone
   * - "tablet": iPad, Android tablets, etc.
   */
  deviceClassification: 'desktop' | 'mobile' | 'tablet';

  /**
   * Operating system (e.g., "Windows", "macOS", "iOS", "Android").
   * Helps identify OS-specific bugs or behavior patterns.
   */
  operatingSystemName: string;

  /**
   * Browser name (e.g., "Chrome", "Safari", "Firefox", "Edge").
   * Used to identify browser-specific compatibility issues.
   */
  browserApplicationName?: string;

  /**
   * Browser version (e.g., "120.0.0").
   */
  browserVersionNumber?: string;

  /**
   * Screen resolution in format "WIDTHxHEIGHT" (e.g., "1920x1080").
   * Helps identify responsive design issues or device segments.
   */
  viewportDimensions?: string;

  /**
   * Device type from user agent parsing (e.g., "iPhone", "Samsung Galaxy").
   */
  deviceModelName?: string;
}

/**
 * Instructions for which analytics platforms should receive this event.
 * Used internally by the SDK to route events to configured platforms.
 */
export interface PlatformRoutingInstruction {
  /**
   * Name of the target analytics platform (e.g., "google_analytics_4", "posthog").
   */
  targetPlatformName: string;

  /**
   * Whether this platform is currently enabled in the configuration.
   */
  isPlatformEnabled: boolean;

  /**
   * Whether to transform the event for this platform's specific format.
   * Some platforms have different property naming conventions.
   */
  shouldTransformProperties?: boolean;
}

/**
 * Represents a user's profile and traits for identification and segmentation.
 *
 * This interface is used when calling setUser() to identify who the current
 * visitor is and what we know about them. Properties here are used for
 * segmentation, filtering, and personalization in analytics dashboards.
 *
 * Why: User identification and traits enable cohort analysis and user-level
 * insights. For example, comparing behavior between premium vs free users.
 */
export interface UserIdentificationProfile {
  /**
   * The unique, permanent identifier for this user in your system.
   * Examples: "user_12345", "cust_abc123", or a database primary key.
   *
   * This ID should:
   * - Be consistent across all platforms
   * - Not change during the user's lifetime
   * - Be a string (convert numbers to strings)
   */
  primaryUserId: string;

  /**
   * Temporary identifier for the device/browser before the user signs in.
   * Once a user authenticates, we'll merge this anonymous ID with their user ID.
   * Generated automatically by the SDK.
   */
  anonymousDeviceIdentifier?: string;

  /**
   * Custom attributes and properties about this user for segmentation.
   *
   * Common examples:
   * {
   *   userAccountType: "premium",
   *   accountCreationDate: "2024-01-15",
   *   totalSpentAmount: 1500,
   *   referralSourceChannel: "google_ads",
   *   isVipCustomer: true
   * }
   *
   * These properties are used in analytics dashboards to:
   * - Filter events ("show me actions by premium users")
   * - Segment cohorts ("compare free vs paid user behavior")
   * - Create funnels ("which account type has highest conversion?")
   */
  userTraitsAndAttributes: Record<string, unknown>;

  /**
   * User's email address. Useful for email-based cohorts or direct outreach.
   * Optional, but recommended for linking to email campaigns.
   */
  emailAddressForUser?: string;

  /**
   * User's phone number. Optional, for SMS-based cohorts or verification.
   */
  phoneNumberForUser?: string;

  /**
   * When this user first appeared in your system (Unix timestamp milliseconds).
   * Useful for calculating user age, tenure, or cohorts by signup date.
   */
  profileCreationTimestamp: number;

  /**
   * The last time this user was active (Unix timestamp milliseconds).
   * Automatically updated by the SDK whenever an event is recorded.
   * Used to calculate churn or identify inactive users.
   */
  lastActivityTimestamp: number;
}

/**
 * Represents the result of validating an event before sending it.
 * Used internally to determine if an event is valid and can be sent.
 */
export interface EventValidationResult {
  /**
   * Whether the event passed all validation rules.
   */
  isEventValid: boolean;

  /**
   * List of validation errors found (empty if valid).
   * Each error describes what was wrong and why.
   */
  validationErrorMessages: string[];

  /**
   * The validated and potentially transformed event data.
   * May differ slightly from input (e.g., additional fields added).
   */
  processedEventData?: AnalyticsEventRecord;
}

/**
 * Represents a batched group of events ready to be sent to an analytics platform.
 * Used internally for batching multiple events together to reduce API calls.
 */
export interface EventBatch {
  /**
   * Unique identifier for this batch.
   */
  batchIdentifier: string;

  /**
   * Timestamp when this batch was created.
   */
  batchCreationTimestamp: number;

  /**
   * The events included in this batch.
   */
  eventsInBatch: AnalyticsEventRecord[];

  /**
   * Which platform(s) this batch is intended for.
   */
  targetPlatforms: string[];

  /**
   * Number of retry attempts for this batch.
   * Used for exponential backoff when network failures occur.
   */
  deliveryAttemptCount: number;
}

/**
 * Represents the result of sending a batch of events to a platform.
 * Used to track whether delivery was successful.
 */
export interface BatchDeliveryResult {
  /**
   * Which platform this batch was sent to.
   */
  targetedAnalyticsPlatform: string;

  /**
   * Whether delivery was successful.
   */
  wasDeliverySuccessful: boolean;

  /**
   * If delivery failed, the error message.
   */
  deliveryErrorMessage?: string;

  /**
   * Timestamp when delivery was attempted.
   */
  deliveryAttemptTimestamp: number;

  /**
   * HTTP status code returned by the platform (if applicable).
   */
  httpResponseStatusCode?: number;
}

/**
 * Configuration for how events should be tracked on a specific page or screen.
 * Used to customize event tracking behavior per page.
 */
export interface PageOrScreenTrackingConfiguration {
  /**
   * Name of the page/screen for identification.
   * Example: "checkout", "user_profile", "social_feed".
   */
  pageOrScreenIdentifierName: string;

  /**
   * Whether to automatically track page view events for this page.
   * If true, an event is automatically created when user visits.
   */
  shouldAutomaticallyTrackPageView: boolean;

  /**
   * Whether to track time spent on this page.
   * If true, an event is created when user leaves with duration.
   */
  shouldTrackTimeSpentOnPage: boolean;

  /**
   * Custom properties to attach to all events on this page.
   * Useful for page-level context (e.g., { pageSection: "checkout" }).
   */
  defaultPropertiesForPage?: Record<string, unknown>;
}
