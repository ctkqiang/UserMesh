/**
 * Configuration type definitions for the UserMesh SDK.
 *
 * These types define how the SDK should be configured at initialization time.
 * Configuration determines which analytics platforms are enabled, how events
 * are batched and sent, and what security/privacy measures to apply.
 *
 * Why: Configuration is crucial for customizing the SDK to different environments
 * (development vs production) and different business needs (which platforms to use).
 * When: Defined once at SDK initialization in your application's startup code.
 */

/**
 * Main configuration object passed to UserMesh.init().
 *
 * This is what developers pass when setting up the SDK. It controls:
 * - Which analytics platforms are enabled
 * - How events are batched and transmitted
 * - Security and privacy settings
 * - Debug and logging behavior
 *
 * Example usage:
 * ```typescript
 * const userMeshConfig: UserMeshSdkConfiguration = {
 *   analyticsIntegrations: {
 *     googleAnalytics4: {
 *       isEnabled: true,
 *       googlePropertyIdentifier: "G-ABC123"
 *     },
 *     postHogPlatform: {
 *       isEnabled: true,
 *       projectApiKey: "phc_xyz789"
 *     }
 *   },
 *   sdkBehaviorConfiguration: {
 *     maximumQueuedEventsBeforeFlushing: 20,
 *     flushIntervalMilliseconds: 10000,
 *     enableDetailedDebugLogging: true
 *   }
 * };
 * ```
 */
export interface UserMeshSdkConfiguration {
  /**
   * Configuration for integrating with third-party analytics platforms.
   * Each platform that you want to use must be explicitly enabled with credentials.
   */
  analyticsIntegrations: AnalyticsIntegrationsConfiguration;

  /**
   * Configuration for how the SDK should behave at runtime.
   * Controls batching, flushing, queue sizes, and debug output.
   */
  sdkBehaviorConfiguration?: SdkRuntimeBehaviorConfiguration;

  /**
   * Configuration for data security, privacy, and retention.
   * Controls encryption, PII redaction, and data lifecycle.
   */
  securityAndPrivacyConfiguration?: DataSecurityAndPrivacyConfiguration;
}

/**
 * Configuration for which analytics platforms are enabled and their credentials.
 *
 * Each platform is optional - configure only the ones you want to use.
 * The SDK will transparently send events to all enabled platforms.
 *
 * Why separate configs: Different platforms have different credential formats
 * and optional features, so each gets its own configuration object.
 */
export interface AnalyticsIntegrationsConfiguration {
  /**
   * Google Analytics 4 integration configuration.
   * GA4 is recommended for most applications as it's free and feature-rich.
   */
  googleAnalytics4?: GoogleAnalytics4IntegrationConfiguration;

  /**
   * PostHog integration configuration.
   * PostHog is excellent for product analytics and feature flags.
   * Can be self-hosted or cloud-hosted.
   */
  postHogPlatform?: PostHogAnalyticsIntegrationConfiguration;

  /**
   * Mixpanel integration configuration.
   * Mixpanel specializes in user behavior analytics and funnels.
   */
  mixpanelPlatform?: MixpanelAnalyticsIntegrationConfiguration;

  /**
   * Microsoft Clarity integration configuration.
   * Clarity provides session recordings and heatmaps for web applications.
   */
  microsoftClarity?: MicrosoftClarityIntegrationConfiguration;

  /**
   * Custom analytics endpoint configuration.
   * Use this to send events to your own backend or a platform not listed above.
   * Useful for collecting data in your own data warehouse.
   */
  customAnalyticsEndpoints?: CustomAnalyticsEndpointConfiguration[];
}

/**
 * Configuration for Google Analytics 4 integration.
 *
 * GA4 is Google's modern analytics platform. It's free, widely-used,
 * and provides excellent web analytics capabilities.
 *
 * How to get credentials:
 * 1. Go to Google Analytics admin panel
 * 2. Find your property
 * 3. Copy the "Google Analytics ID" (format: G-XXXXXXXXXX)
 */
export interface GoogleAnalytics4IntegrationConfiguration {
  /**
   * Whether to enable Google Analytics 4 integration.
   * If false, GA4 will not be called even if other config is provided.
   * Default: true if configuration is provided.
   */
  isEnabled: boolean;

  /**
   * Your Google Analytics 4 property ID.
   * Format: "G-XXXXXXXXXX"
   * Find this in GA4 admin: Data Streams > select your stream > copy the Measurement ID
   *
   * This is required if GA4 is enabled.
   */
  googlePropertyIdentifier: string;

  /**
   * Optional: Measurement ID (alternative way to identify your GA4 property).
   * Some implementations use this instead of Property ID.
   */
  measurementIdentifier?: string;

  /**
   * Optional: Custom domain for GA4 (rarely needed, defaults to Google's servers).
   * Only set this if you're using a custom GA4 proxy or have special requirements.
   */
  customGa4DomainUrl?: string;

  /**
   * Optional: User ID to associate with GA4 (for cross-device tracking).
   * If provided, GA4 will track events across multiple devices for this user.
   */
  ga4UserIdForTracking?: string;
}

/**
 * Configuration for PostHog analytics integration.
 *
 * PostHog is an open-source product analytics platform with excellent feature flag support.
 * It can be used as a service (cloud.posthog.com) or self-hosted.
 *
 * How to get credentials:
 * 1. Create a PostHog account or access your self-hosted instance
 * 2. Get your project API key from project settings
 * 3. Copy the API key and instance URL
 */
export interface PostHogAnalyticsIntegrationConfiguration {
  /**
   * Whether to enable PostHog integration.
   * If false, PostHog will not be called.
   * Default: true if configuration is provided.
   */
  isEnabled: boolean;

  /**
   * Your PostHog project API key.
   * Format: typically starts with "phc_"
   * Find this in PostHog project settings.
   *
   * This is required if PostHog is enabled.
   */
  projectApiKey: string;

  /**
   * Optional: Custom PostHog instance URL.
   * Use this if you're self-hosting PostHog.
   * Default: "https://us.i.posthog.com" (cloud-hosted)
   *
   * Examples:
   * - Self-hosted: "https://posthog.your-company.com"
   * - EU cloud: "https://eu.i.posthog.com"
   * - US cloud: "https://us.i.posthog.com"
   */
  customHostUrl?: string;

  /**
   * Optional: Custom domain to send data to (if using a proxy).
   * Leave empty to use the PostHog domain directly.
   */
  customProxyDomainForData?: string;
}

/**
 * Configuration for Mixpanel analytics integration.
 *
 * Mixpanel specializes in user behavior analytics and provides
 * excellent funnel analysis and cohort building capabilities.
 *
 * How to get credentials:
 * 1. Log in to your Mixpanel account
 * 2. Go to project settings
 * 3. Copy your project token
 */
export interface MixpanelAnalyticsIntegrationConfiguration {
  /**
   * Whether to enable Mixpanel integration.
   * If false, Mixpanel will not be called.
   * Default: true if configuration is provided.
   */
  isEnabled: boolean;

  /**
   * Your Mixpanel project token.
   * Format: alphanumeric string
   * Find this in Mixpanel project settings > Project Token.
   *
   * This is required if Mixpanel is enabled.
   */
  projectToken: string;

  /**
   * Optional: Batch size for Mixpanel events.
   * Mixpanel batches events before sending to reduce API calls.
   * Default: 50 events per batch.
   */
  eventBatchSizeForMixpanel?: number;

  /**
   * Optional: Custom proxy domain for Mixpanel (for corporate firewalls).
   * Leave empty to send directly to Mixpanel's servers.
   */
  mixpanelProxyDomain?: string;
}

/**
 * Configuration for Microsoft Clarity integration.
 *
 * Clarity provides session recordings and heatmaps for understanding
 * user behavior on your website. It's particularly useful for UX optimization.
 *
 * How to get credentials:
 * 1. Go to Microsoft Clarity (clarity.microsoft.com)
 * 2. Create a project for your website
 * 3. Copy the project ID from the tracking code
 */
export interface MicrosoftClarityIntegrationConfiguration {
  /**
   * Whether to enable Microsoft Clarity integration.
   * If false, Clarity will not be called.
   * Default: true if configuration is provided.
   */
  isEnabled: boolean;

  /**
   * Your Microsoft Clarity project ID.
   * Format: typically alphanumeric (e.g., "abcd1234")
   * Find this in Clarity project settings > Tracking Code.
   *
   * This is required if Clarity is enabled.
   */
  projectIdentifier: string;

  /**
   * Optional: Whether to record all sessions.
   * If false, only a sample of sessions will be recorded (saves bandwidth).
   * Default: true (record all sessions).
   */
  shouldRecordAllSessions?: boolean;

  /**
   * Optional: Mask for sensitive form inputs (passwords, credit cards, etc).
   * Clarity can automatically mask sensitive fields you specify.
   * Default: Standard masking (passwords, credit cards).
   */
  sensitiveFormFieldMaskingPatterns?: string[];
}

/**
 * Configuration for custom analytics endpoints.
 *
 * Use this to send events to your own backend, data warehouse,
 * or any analytics platform not explicitly supported by UserMesh.
 *
 * This is useful for:
 * - Collecting data in your own infrastructure
 * - Using an unsupported analytics platform
 * - Sending data to multiple internal services
 */
export interface CustomAnalyticsEndpointConfiguration {
  /**
   * Friendly name for this endpoint (for logging and identification).
   * Examples: "internal_analytics", "data_warehouse", "custom_segment".
   */
  endpointName: string;

  /**
   * The full URL where events should be sent.
   * Must be a valid HTTP/HTTPS endpoint that accepts POST requests.
   * Example: "https://analytics.company.com/api/events"
   */
  endpointUrl: string;

  /**
   * Whether this endpoint is currently enabled.
   * Set to false to temporarily disable sending to this endpoint.
   */
  isEndpointEnabled: boolean;

  /**
   * HTTP method for this endpoint.
   * Most analytics endpoints use POST, but some might use PUT or PATCH.
   * Default: "POST"
   */
  httpMethodForEndpoint?: 'POST' | 'PUT' | 'PATCH';

  /**
   * Custom HTTP headers to include with every request to this endpoint.
   * Useful for authentication (Authorization header) or custom metadata.
   *
   * Example:
   * {
   *   "Authorization": "Bearer YOUR_TOKEN",
   *   "X-Custom-Header": "value"
   * }
   */
  customHttpHeadersForRequests?: Record<string, string>;

  /**
   * Custom event transformation function (advanced).
   * If provided, this function is called to transform events before sending.
   * Useful if the endpoint expects a different event format.
   *
   * Why: Different platforms have different event formats. This allows
   * you to adapt UserMesh's standard format to your endpoint's requirements.
   *
   * When: Only if your endpoint expects a non-standard format.
   *
   * Example:
   * ```typescript
   * eventTransformer: (event) => ({
   *   timestamp: event.eventTimestampMilliseconds,
   *   name: event.analyticsEventName,
   *   userId: event.authenticatedUserId,
   *   data: event.eventPropertiesData
   * })
   * ```
   */
  customEventTransformationFunction?: (event: any) => unknown;
}

/**
 * Configuration for SDK runtime behavior.
 * Controls how events are queued, batched, and transmitted.
 */
export interface SdkRuntimeBehaviorConfiguration {
  /**
   * Maximum number of events to queue in memory before automatically flushing.
   * When this limit is reached, all queued events are sent immediately.
   * Default: 20 events.
   *
   * Why: Balances between reducing API calls (higher number) and reducing
   * memory usage (lower number). Higher values = fewer API calls but more memory.
   * When: Use higher values for high-traffic apps, lower for memory-constrained.
   */
  maximumQueuedEventsBeforeFlushing?: number;

  /**
   * Interval in milliseconds between automatic flushes.
   * Even if the queue isn't full, events are sent after this interval.
   * Default: 5000 milliseconds (5 seconds).
   *
   * Why: Ensures events are sent even if user isn't active. Prevents
   * events from sitting in queue indefinitely if user closes browser.
   * When: Adjust based on how fresh you need analytics data.
   * - Production: 5000-10000ms (more real-time)
   * - Development: 30000ms+ (reduce API spam)
   */
  flushIntervalMilliseconds?: number;

  /**
   * Maximum number of events to keep in offline queue.
   * Events exceeding this limit are dropped to prevent memory overflow.
   * Default: 100 events.
   *
   * Why: Offline queue can grow large if app is offline for extended time.
   * This prevents memory exhaustion on low-memory devices.
   * When: Adjust based on available device memory and offline usage patterns.
   */
  maximumOfflineQueueCapacity?: number;

  /**
   * Whether to enable detailed debug logging to browser console.
   * Default: false in production, true in development.
   *
   * If enabled, logs will show:
   * - All events being tracked
   * - Network requests to analytics platforms
   * - Validation errors
   * - Queue flushing operations
   *
   * Why: Useful during development to verify tracking is working correctly.
   * When: Enable during development, disable in production to avoid console spam.
   */
  enableDetailedDebugLogging?: boolean;

  /**
   * The application environment.
   * - "development": More debug output, validation is stricter, test events accepted
   * - "production": Less output, validation is lenient, only real events sent
   * Default: "production"
   */
  operatingMode?: 'development' | 'production';

  /**
   * Global on/off switch for all analytics tracking.
   * If false, no events are sent to any platform.
   * Default: true (tracking enabled).
   *
   * Why: Useful for respecting user opt-out preferences or complying with GDPR.
   * When: Set to false if user disables analytics in settings,
   * or if you're in a mode where tracking should be disabled.
   */
  enableAnalyticsTracking?: boolean;

  /**
   * Maximum time (in milliseconds) to wait for a single event to be processed.
   * If processing takes longer, it's abandoned to prevent UI blocking.
   * Default: 5000 milliseconds (5 seconds).
   */
  maximumEventProcessingTimeoutMilliseconds?: number;

  /**
   * Whether to automatically track standard page/app events.
   * Includes: page views, clicks, form submissions, etc.
   * Default: true
   */
  shouldAutomaticallyTrackStandardEvents?: boolean;
}

/**
 * Configuration for data security, privacy, and retention.
 * Controls how sensitive data is handled and stored.
 */
export interface DataSecurityAndPrivacyConfiguration {
  /**
   * Whether to encrypt event data before storing offline.
   * Uses AES-256 encryption.
   * Default: true (encryption enabled).
   *
   * Why: If device is lost or stolen, encrypted data cannot be read.
   * Encrypting at rest is a security best practice.
   * When: Should be enabled unless you have specific performance requirements.
   */
  enableDataEncryption?: boolean;

  /**
   * Optional: Encryption key material for AES-256 encryption.
   * If not provided, a key is auto-generated and stored.
   * Format: Base64-encoded 32-byte key.
   *
   * Why: Using a custom key allows you to manage encryption keys centrally.
   * When: Use if you have key management infrastructure already.
   *
   * Advanced: Only set if you understand encryption key management.
   */
  encryptionKeyMaterial?: string;

  /**
   * Whether to redact personally identifiable information (PII) from events.
   * Removes/masks: emails, phone numbers, credit card numbers, SSNs, etc.
   * Default: false (no redaction).
   *
   * Why: Reduces privacy risk if events are accidentally exposed.
   * Compliance: Required in some jurisdictions (GDPR, CCPA, etc).
   * When: Enable if you must reduce PII in analytics data.
   */
  shouldRedactPersonalInformation?: boolean;

  /**
   * Patterns for detecting and masking PII (advanced).
   * Uses regex patterns to identify sensitive fields.
   * Only used if shouldRedactPersonalInformation is true.
   *
   * Example:
   * ```typescript
   * personalInformationDetectionPatterns: [
   *   { fieldName: /email/, maskValue: "[REDACTED_EMAIL]" },
   *   { fieldName: /phone/, maskValue: "[REDACTED_PHONE]" },
   *   { fieldName: /credit_card/, maskValue: "[REDACTED_CC]" }
   * ]
   * ```
   */
  personalInformationDetectionPatterns?: Array<{
    fieldNamePattern: RegExp;
    maskedValueReplacement: string;
  }>;

  /**
   * How many days to retain events in offline storage before deleting.
   * After this period, old events are automatically purged.
   * Default: 30 days.
   *
   * Why: Limits how much data is stored and reduces compliance burden.
   * When: Set lower for sensitive data, higher for important analytics.
   * - GDPR: 30 days recommended
   * - CCPA: 30-90 days
   * - Internal use: 90+ days
   */
  dataRetentionDaysCount?: number;

  /**
   * Whether to honor Do Not Track (DNT) browser setting.
   * If user has DNT enabled, no events are sent.
   * Default: true (respect DNT).
   *
   * Why: Respects user privacy preferences and improves compliance.
   * When: Should be true in most cases for privacy-conscious apps.
   */
  shouldRespectDoNotTrackBrowserSetting?: boolean;

  /**
   * Cookie domain to use for first-party cookies (if applicable).
   * Default: Current domain.
   *
   * Why: For multi-domain tracking (subdomains on same parent domain).
   * Example: ".company.com" to track across all company.com subdomains.
   */
  cookieDomainForTracking?: string;

  /**
   * Whether to use secure (HTTPS-only) cookies.
   * Default: true in production, false in development.
   *
   * Why: Secure cookies cannot be transmitted over unencrypted HTTP.
   * Improves security by preventing interception.
   */
  shouldUseSecureCookiesOnly?: boolean;
}
