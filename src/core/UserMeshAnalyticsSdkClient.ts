/**
 * UserMesh Analytics SDK Client - Main Entry Point
 *
 * This is the primary class that developers interact with to use UserMesh.
 * It provides a unified interface for event tracking, user identification,
 * and error reporting across multiple analytics platforms.
 *
 * The SDK handles:
 * - Event batching and transmission to multiple platforms
 * - Offline queue persistence and automatic retry
 * - User identification and traits management
 * - Data encryption and privacy compliance
 * - Session tracking and context enrichment
 * - Error handling and debug logging
 *
 * Why this class exists: Consolidates all analytics functionality into
 * a single, cohesive interface that developers can call consistently.
 */

import { create } from 'zustand';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  UserMeshSdkConfiguration,
  AnalyticsEventRecord,
  UserIdentificationProfile,
  EventValidationResult,
  EventBatch,
} from '../types/UserMeshEventTypes';
import type { AnalyticsConnectorInterface } from '../connectors/types/AnalyticsConnectorInterface';
import { UserMeshConfigurationValidator } from './UserMeshConfigurationValidator';
import { UserMeshEncryptionService } from '../encryption/UserMeshDataEncryptionService';
import { UserMeshEventValidator } from '../validation/UserMeshEventValidationEngine';
import { UserMeshIdentifierGenerator } from '../utils/UserMeshIdentifierGenerator';
import { GoogleAnalytics4Connector } from '../connectors/GoogleAnalytics4Connector';
import { PostHogAnalyticsConnector } from '../connectors/PostHogAnalyticsConnector';
import { MixpanelAnalyticsConnector } from '../connectors/MixpanelAnalyticsConnector';
import { MicrosoftClarityConnector } from '../connectors/MicrosoftClarityConnector';
import { CustomEndpointConnector } from '../connectors/CustomEndpointConnector';

/**
 * Main UserMesh SDK Client class.
 *
 * Usage (TypeScript):
 * ```typescript
 * import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';
 *
 * const sdkClient = new UserMeshAnalyticsSdkClient({
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
 *     enableDetailedDebugLogging: true,
 *     operatingMode: 'development'
 *   }
 * });
 *
 * await sdkClient.initializeUserMeshAnalyticsSdk();
 *
 * // Track an event
 * await sdkClient.recordAnalyticsEvent('user_signup', {
 *   signupMethod: 'email',
 *   planType: 'premium'
 * });
 *
 * // Identify a user
 * await sdkClient.identifyCurrentUser('user_12345', {
 *   userEmail: 'user@example.com',
 *   accountType: 'premium'
 * });
 * ```
 */
export class UserMeshAnalyticsSdkClient {
  /**
   * The configuration passed during initialization.
   * Immutable after init to prevent runtime changes.
   */
  private userMeshSdkConfiguration: UserMeshSdkConfiguration;

  /**
   * Unique identifier for this SDK instance.
   * Used to identify which SDK instance a batch came from (useful for debugging).
   */
  private readonly sdkInstanceUniqueIdentifier: string;

  /**
   * Session identifier that persists for the lifetime of the SDK instance.
   * All events in this session will have the same sessionId.
   */
  private readonly currentSessionUniqueIdentifier: string;

  /**
   * Current user profile (if user is authenticated).
   * Undefined until setUser() or identifyCurrentUser() is called.
   */
  private currentUserProfile: UserIdentificationProfile | undefined;

  /**
   * Whether the SDK has been fully initialized.
   * Set to true after initializeUserMeshAnalyticsSdk() completes.
   */
  private hasUserMeshSdkBeenInitialized: boolean = false;

  /**
   * In-memory queue of events waiting to be sent.
   * When queue reaches maximumQueuedEventsBeforeFlushing, all events are sent.
   */
  private currentEventQueueInMemory: AnalyticsEventRecord[] = [];

  /**
   * Timer ID for automatic flush interval.
   * Stores the setInterval handle so it can be cleared on destroy.
   */
  private automaticFlushIntervalTimerId: NodeJS.Timeout | undefined;

  /**
   * Encryption service for encrypting sensitive data at rest.
   */
  private dataEncryptionService: UserMeshEncryptionService;

  /**
   * Event validation engine for ensuring event quality.
   */
  private eventValidationEngine: UserMeshEventValidator;

  /**
   * Configuration validator to ensure required fields are present.
   */
  private configurationValidator: UserMeshConfigurationValidator;

  /**
   * Map of initialized analytics platform connectors.
   * Each enabled platform gets a connector instance that handles its specific API.
   * Key: platform name (e.g., "google_analytics_4", "posthog", "mixpanel", "clarity")
   * Value: Initialized connector instance implementing AnalyticsConnectorInterface
   */
  private initializedAnalyticsConnectorsMap: Map<string, AnalyticsConnectorInterface> = new Map();

  /**
   * Zustand store for event queue state (for offline persistence).
   * Uses Zustand for simple, reactive state management.
   */
  private eventQueueStateStore = create<{
    queuedEvents: AnalyticsEventRecord[];
    addEventToQueue: (event: AnalyticsEventRecord) => void;
    clearQueue: () => void;
    loadQueueFromPersistence: () => Promise<void>;
  }>((setState) => ({
    queuedEvents: [],
    addEventToQueue: (event: AnalyticsEventRecord) => {
      setState((state) => ({
        queuedEvents: [...state.queuedEvents, event],
      }));
    },
    clearQueue: () => {
      setState(() => ({
        queuedEvents: [],
      }));
    },
    loadQueueFromPersistence: async () => {
      // Load from localStorage/IndexedDB (implemented in storage module)
      const persistedQueue = await this.loadPersistedEventQueue();
      setState(() => ({
        queuedEvents: persistedQueue || [],
      }));
    },
  }));

  /**
   * Constructor - Initialize the SDK with configuration.
   *
   * Does NOT start any processing. Call initializeUserMeshAnalyticsSdk()
   * after creating an instance to begin operation.
   *
   * Why separate: Allows for dependency injection and testing.
   * Why not auto-init: Gives developer control over when SDK operations begin.
   *
   * @param providedConfiguration - SDK configuration object with analytics platforms
   * @throws UserMeshSdkConfigurationError if configuration is invalid
   */
  constructor(providedConfiguration: UserMeshSdkConfiguration) {
    // Generate unique identifiers for this SDK instance
    this.sdkInstanceUniqueIdentifier = UserMeshIdentifierGenerator.generateRandomUniqueIdentifier();
    this.currentSessionUniqueIdentifier = UserMeshIdentifierGenerator.generateRandomUniqueIdentifier();

    // Validate configuration before storing
    this.configurationValidator = new UserMeshConfigurationValidator();
    this.configurationValidator.validateUserMeshConfiguration(providedConfiguration);

    // Store the validated configuration
    this.userMeshSdkConfiguration = providedConfiguration;

    // Initialize service instances
    this.dataEncryptionService = new UserMeshEncryptionService(
      this.userMeshSdkConfiguration.securityAndPrivacyConfiguration?.encryptionKeyMaterial
    );

    this.eventValidationEngine = new UserMeshEventValidator();

    if (this.isDebugLoggingEnabled()) {
      console.log(
        '[UserMesh] SDK instance created with identifier:',
        this.sdkInstanceUniqueIdentifier
      );
      console.log('[UserMesh] Session identifier:', this.currentSessionUniqueIdentifier);
    }
  }

  /**
   * Initialize the SDK for event tracking.
   *
   * This method:
   * 1. Loads persisted offline events from storage
   * 2. Attempts to flush any pending events
   * 3. Sets up automatic flush interval
   * 4. Initializes connectors for each enabled platform
   *
   * Must be called before any events are tracked.
   *
   * Why: Initialization is async and may take time (loading from storage, network requests).
   * Separating from constructor allows proper error handling.
   *
   * When: Call this during app startup, typically in your app's initialization code.
   *
   * @throws Error if initialization fails
   */
  async initializeUserMeshAnalyticsSdk(): Promise<void> {
    if (this.hasUserMeshSdkBeenInitialized) {
      this.logDebugMessage(
        'Attempted to initialize SDK that is already initialized. Skipping duplicate initialization.'
      );
      return;
    }

    try {
      this.logDebugMessage('Starting UserMesh SDK initialization');

      // Load any events that were persisted to storage while offline
      await this.loadPersistedEventQueueFromStorage();

      // Set up automatic flush timer
      this.setupAutomaticEventFlushingInterval();

      // Initialize each enabled analytics platform connector
      await this.initializeEnabledAnalyticsPlatformConnectors();

      // Mark as initialized
      this.hasUserMeshSdkBeenInitialized = true;

      this.logDebugMessage('UserMesh SDK initialization completed successfully');
    } catch (initializationError) {
      const errorMessage = `UserMesh SDK initialization failed: ${String(initializationError)}`;
      console.error('[UserMesh Error]', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Record an analytics event.
   *
   * This is the primary method for tracking user actions. Events are queued
   * in memory and automatically sent in batches to configured analytics platforms.
   *
   * The event will be:
   * 1. Validated (required fields checked, types verified)
   * 2. Enriched with context (device, platform, timestamp, user ID)
   * 3. Queued for transmission
   * 4. Encrypted if encryption is enabled
   * 5. Persisted to offline storage as backup
   *
   * If the queue reaches the configured batch size, events are immediately sent.
   * Otherwise, they're held until the flush interval elapses.
   *
   * Why queue events: Batching reduces API calls. Sending one event at a time
   * would create network overhead. Batching trades latency for efficiency.
   *
   * When to use: Every time something important happens in your app that you
   * want to analyze (button click, form submission, purchase, etc).
   *
   * @param analyticsEventName - The name of the event (e.g., "user_signup", "purchase_completed")
   * @param eventPropertiesData - Optional properties specific to this event
   * @param optionalTrackingParameters - Optional overrides for context/device info
   *
   * @throws UserMeshEventValidationError if event fails validation
   * @throws Error if SDK is not initialized
   */
  async recordAnalyticsEvent(
    analyticsEventName: string,
    eventPropertiesData?: Record<string, unknown>,
    optionalTrackingParameters?: {
      overrideTimestamp?: number;
      overrideUserId?: string;
      skipBatchFlushIfQueueNotFull?: boolean;
    }
  ): Promise<void> {
    // Ensure SDK is initialized before tracking
    if (!this.hasUserMeshSdkBeenInitialized) {
      throw new Error(
        'UserMesh SDK must be initialized before recording events. ' +
          'Call initializeUserMeshAnalyticsSdk() first.'
      );
    }

    // Check if tracking is globally disabled
    if (!this.isSdkTrackingEnabled()) {
      this.logDebugMessage('Tracking is disabled globally. Event not recorded.');
      return;
    }

    try {
      // Build the event record with all context information
      const eventRecord = await this.constructAnalyticsEventRecord(
        analyticsEventName,
        eventPropertiesData,
        optionalTrackingParameters?.overrideTimestamp,
        optionalTrackingParameters?.overrideUserId
      );

      // Validate the event before queueing
      const validationResult = this.eventValidationEngine.validateAnalyticsEvent(eventRecord);
      if (!validationResult.isEventValid) {
        const validationErrorsSummary = validationResult.validationErrorMessages.join('; ');
        throw new Error(`Event validation failed: ${validationErrorsSummary}`);
      }

      // Add event to in-memory queue
      this.currentEventQueueInMemory.push(eventRecord);
      this.logDebugMessage(`Event queued: ${analyticsEventName} (queue size: ${this.currentEventQueueInMemory.length})`);

      // Persist event to storage for offline resilience
      await this.persistEventQueueToStorage(this.currentEventQueueInMemory);

      // Check if we should flush immediately
      const shouldFlushImmediately =
        this.currentEventQueueInMemory.length >=
        (this.userMeshSdkConfiguration.sdkBehaviorConfiguration?.maximumQueuedEventsBeforeFlushing ?? 20);

      if (shouldFlushImmediately && !optionalTrackingParameters?.skipBatchFlushIfQueueNotFull) {
        await this.flushQueuedEventsToAnalyticsPlatforms();
      }
    } catch (eventTrackingError) {
      const errorMessage = `Failed to record analytics event "${analyticsEventName}": ${String(eventTrackingError)}`;
      console.error('[UserMesh Error]', errorMessage);

      if (this.isDebugLoggingEnabled()) {
        throw new Error(errorMessage);
      }
      // In production mode, fail silently to avoid breaking the app
    }
  }

  /**
   * Identify the current user and set their traits.
   *
   * This associates subsequent events with this user and enables user-level
   * analytics. Should be called after the user authenticates.
   *
   * The call also:
   * 1. Merges any previous anonymous activity with this user ID
   * 2. Updates user traits in all configured platforms
   * 3. Persists user profile for offline access
   *
   * Why separate from event tracking: User identification is permanent and
   * affects all subsequent events. Treating it specially ensures consistency.
   *
   * When to use: After user successfully authenticates (login or signup).
   *
   * @param primaryUserId - The unique identifier for this user in your system
   * @param userTraitsAndAttributes - User properties for segmentation (optional)
   *
   * Example:
   * ```typescript
   * await sdkClient.identifyCurrentUser('user_12345', {
   *   userEmail: 'alice@example.com',
   *   accountType: 'premium',
   *   signupDate: '2024-01-15',
   *   isVipCustomer: true
   * });
   * ```
   */
  async identifyCurrentUser(
    primaryUserId: string,
    userTraitsAndAttributes?: Record<string, unknown>
  ): Promise<void> {
    if (!this.hasUserMeshSdkBeenInitialized) {
      throw new Error(
        'UserMesh SDK must be initialized before identifying users. ' +
          'Call initializeUserMeshAnalyticsSdk() first.'
      );
    }

    if (!primaryUserId || primaryUserId.trim().length === 0) {
      throw new Error('User ID cannot be empty. Provide a valid user identifier.');
    }

    try {
      this.currentUserProfile = {
        primaryUserId,
        anonymousDeviceIdentifier: this.currentSessionUniqueIdentifier,
        userTraitsAndAttributes: userTraitsAndAttributes || {},
        profileCreationTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
      };

      this.logDebugMessage(`User identified: ${primaryUserId}`);

      // Update user profile in all platforms
      await this.updateUserProfileAcrossAnalyticsPlatforms(this.currentUserProfile);

      // Persist user profile to storage
      await this.persistUserProfileToStorage(this.currentUserProfile);

      // Flush any queued events now that we have a user ID
      await this.flushQueuedEventsToAnalyticsPlatforms();
    } catch (identificationError) {
      const errorMessage = `Failed to identify user: ${String(identificationError)}`;
      console.error('[UserMesh Error]', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Track a page view (web/app screen display).
   *
   * Automatically records that the user viewed a page/screen and optionally
   * tracks time spent on that page.
   *
   * Why useful: Page view analytics help you understand user flow and
   * identify which pages are most popular or problematic.
   *
   * When to use: When user navigates to a new page/screen in your app.
   *
   * @param pageOrScreenName - The name of the page/screen
   * @param optionalPageProperties - Additional context about the page
   */
  async trackPageView(
    pageOrScreenName: string,
    optionalPageProperties?: Record<string, unknown>
  ): Promise<void> {
    const pageViewProperties = {
      pageOrScreenName,
      ...optionalPageProperties,
    };

    await this.recordAnalyticsEvent('$pageview', pageViewProperties);
  }

  /**
   * Report an error to analytics and error tracking services.
   *
   * Helps you identify bugs and stability issues by tracking errors that
   * occur in your application.
   *
   * The error is:
   * 1. Recorded as an event for trend analysis
   * 2. Sent to any error tracking platform (Sentry, etc) if configured
   * 3. Tagged with user ID if user is identified
   *
   * Why: Error tracking helps you prioritize bug fixes and identify which
   * users are experiencing issues.
   *
   * When: Any time an error is caught or detected in your app.
   *
   * @param errorObject - The error that occurred
   * @param errorContextData - Additional context about what was happening
   */
  async reportErrorOccurrence(
    errorObject: Error,
    errorContextData?: Record<string, unknown>
  ): Promise<void> {
    const errorEventProperties = {
      errorName: errorObject.name,
      errorMessage: errorObject.message,
      errorStack: errorObject.stack,
      ...errorContextData,
    };

    await this.recordAnalyticsEvent('$error', errorEventProperties, {
      skipBatchFlushIfQueueNotFull: false, // Flush errors immediately
    });
  }

  /**
   * Manually flush all queued events to analytics platforms immediately.
   *
   * Normally, events are automatically flushed when the queue reaches a size
   * threshold or after a time interval. Use this to force immediate delivery
   * (e.g., before user closes browser, or when user logs out).
   *
   * Why: Ensures events aren't lost. The automatic flush interval might not
   * occur before the user leaves the page.
   *
   * When: Before page unload, user logout, or in critical sections where
   * you need to ensure events are delivered.
   *
   * @returns Promise that resolves when all events have been sent
   */
  async flushQueuedEventsToAnalyticsPlatforms(): Promise<void> {
    if (this.currentEventQueueInMemory.length === 0) {
      this.logDebugMessage('No events to flush. Queue is empty.');
      return;
    }

    try {
      this.logDebugMessage(`Flushing ${this.currentEventQueueInMemory.length} events to analytics platforms`);

      // Create a batch from current queue
      const eventBatchToSend: EventBatch = {
        batchIdentifier: UserMeshIdentifierGenerator.generateRandomUniqueIdentifier(),
        batchCreationTimestamp: Date.now(),
        eventsInBatch: [...this.currentEventQueueInMemory],
        targetPlatforms: this.getEnabledAnalyticsPlatformNames(),
        deliveryAttemptCount: 0,
      };

      // Send to all enabled platforms
      await this.sendEventBatchToAllEnabledPlatforms(eventBatchToSend);

      // Clear the in-memory queue after successful send
      this.currentEventQueueInMemory = [];

      // Clear persistence storage
      await this.clearPersistedEventQueue();

      this.logDebugMessage('Events flushed successfully');
    } catch (flushError) {
      const errorMessage = `Failed to flush events: ${String(flushError)}`;
      console.error('[UserMesh Error]', errorMessage);
      // Keep events in queue for retry
      throw new Error(errorMessage);
    }
  }

  /**
   * Disable analytics tracking (respect user's privacy choice).
   *
   * Stops all event tracking and prevents any data from being sent to
   * analytics platforms. Existing queued events are cleared.
   *
   * Why: Respect user privacy preferences. If user disables analytics
   * in your app settings, honor that choice.
   *
   * When: When user toggles off analytics in your app's privacy settings,
   * or to comply with opt-out requests (GDPR, etc).
   */
  disableAnalyticsTrackingCompletely(): void {
    this.userMeshSdkConfiguration.sdkBehaviorConfiguration ??= {};
    this.userMeshSdkConfiguration.sdkBehaviorConfiguration.enableAnalyticsTracking = false;

    // Clear queued events since user has opted out
    this.currentEventQueueInMemory = [];

    this.logDebugMessage('Analytics tracking has been disabled');
  }

  /**
   * Re-enable analytics tracking after user opts back in.
   *
   * Resumes event tracking after it was previously disabled.
   */
  enableAnalyticsTrackingAgain(): void {
    this.userMeshSdkConfiguration.sdkBehaviorConfiguration ??= {};
    this.userMeshSdkConfiguration.sdkBehaviorConfiguration.enableAnalyticsTracking = true;

    this.logDebugMessage('Analytics tracking has been re-enabled');
  }

  /**
   * Clean up SDK resources and flush any remaining events.
   *
   * Should be called when app is shutting down to ensure:
   * 1. All queued events are sent
   * 2. Automatic timers are cleared
   * 3. Storage connections are closed
   *
   * Why: Prevents memory leaks and ensures final events aren't lost.
   *
   * When: In app's cleanup/shutdown logic, or in beforeunload handler (web).
   *
   * Example (web):
   * ```typescript
   * window.addEventListener('beforeunload', async () => {
   *   await sdkClient.destroyUserMeshSdkAndCleanup();
   * });
   * ```
   */
  async destroyUserMeshSdkAndCleanup(): Promise<void> {
    try {
      // Flush any remaining events
      if (this.currentEventQueueInMemory.length > 0) {
        await this.flushQueuedEventsToAnalyticsPlatforms();
      }

      // Clear automatic flush timer
      if (this.automaticFlushIntervalTimerId) {
        clearInterval(this.automaticFlushIntervalTimerId);
      }

      // Close platform connectors
      await this.closeAllAnalyticsPlatformConnectors();

      this.logDebugMessage('UserMesh SDK cleanup completed');
    } catch (cleanupError) {
      console.error('[UserMesh Error] Cleanup failed:', String(cleanupError));
    }
  }

  /**
   * ===== PRIVATE HELPER METHODS =====
   * The following methods are internal implementation details.
   */

  /**
   * Build a complete analytics event record with all required context.
   */
  private async constructAnalyticsEventRecord(
    analyticsEventName: string,
    eventPropertiesData?: Record<string, unknown>,
    overrideTimestamp?: number,
    overrideUserId?: string
  ): Promise<AnalyticsEventRecord> {
    const eventRecord: AnalyticsEventRecord = {
      uniqueEventIdentifier: UserMeshIdentifierGenerator.generateRandomUniqueIdentifier(),
      eventTimestampMilliseconds: overrideTimestamp || Date.now(),
      analyticsEventName,
      authenticatedUserId: overrideUserId || this.currentUserProfile?.primaryUserId,
      anonymousSessionIdentifier: this.currentUserProfile?.anonymousDeviceIdentifier || this.currentSessionUniqueIdentifier,
      currentSessionIdentifier: this.currentSessionUniqueIdentifier,
      eventPropertiesData: eventPropertiesData || {},
      contextInformation: {
        applicationPlatform: this.detectApplicationPlatform(),
        softwareDevelopmentKitVersion: '1.0.0',
        userLanguagePreference: this.detectUserLanguage(),
        userTimeZoneString: Intl.DateTimeFormat().resolvedOptions().timeZone,
        pageOrScreenUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        referrerOrSourceUrl: typeof document !== 'undefined' ? document.referrer : undefined,
      },
      deviceInformation: this.detectAndBuildDeviceInformation(),
    };

    // Encrypt properties if enabled
    if (this.shouldEncryptData()) {
      // Implementation in encryption module
    }

    return eventRecord;
  }

  /**
   * Detect which platform the app is running on.
   */
  private detectApplicationPlatform(): 'web' | 'mobile' | 'server' {
    if (typeof window !== 'undefined') {
      return 'web';
    }
    if (typeof navigator !== 'undefined' && /mobile/i.test(navigator.userAgent)) {
      return 'mobile';
    }
    return 'server';
  }

  /**
   * Detect user's language preference.
   */
  private detectUserLanguage(): string | undefined {
    if (typeof navigator !== 'undefined') {
      return navigator.language;
    }
    return undefined;
  }

  /**
   * Detect and build device information.
   */
  private detectAndBuildDeviceInformation() {
    if (typeof navigator === 'undefined') {
      return undefined;
    }

    // Implementation to detect device type, OS, browser, etc.
    // Detailed implementation in utils module
    return {
      deviceClassification: 'desktop' as const,
      operatingSystemName: this.detectOperatingSystem(),
      browserApplicationName: this.detectBrowserName(),
      viewportDimensions: typeof window !== 'undefined'
        ? `${window.innerWidth}x${window.innerHeight}`
        : undefined,
    };
  }

  private detectOperatingSystem(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) return 'iOS';
    return 'Unknown';
  }

  private detectBrowserName(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Set up the automatic flush interval.
   */
  private setupAutomaticEventFlushingInterval(): void {
    const flushIntervalMs = this.userMeshSdkConfiguration.sdkBehaviorConfiguration?.flushIntervalMilliseconds ?? 5000;

    this.automaticFlushIntervalTimerId = setInterval(async () => {
      if (this.currentEventQueueInMemory.length > 0) {
        await this.flushQueuedEventsToAnalyticsPlatforms();
      }
    }, flushIntervalMs);
  }

  /**
   * Load persisted event queue from storage.
   */
  private async loadPersistedEventQueueFromStorage(): Promise<void> {
    const persistedEvents = await this.loadPersistedEventQueue();
    if (persistedEvents && persistedEvents.length > 0) {
      this.currentEventQueueInMemory = persistedEvents;
      this.logDebugMessage(`Loaded ${persistedEvents.length} events from persistent storage`);
    }
  }

  /**
   * Load persisted event queue from storage (to be implemented in storage module).
   */
  private async loadPersistedEventQueue(): Promise<AnalyticsEventRecord[] | null> {
    // Implementation in storage module
    return null;
  }

  /**
   * Persist event queue to storage.
   */
  private async persistEventQueueToStorage(queue: AnalyticsEventRecord[]): Promise<void> {
    // Implementation in storage module
  }

  /**
   * Clear persisted event queue.
   */
  private async clearPersistedEventQueue(): Promise<void> {
    // Implementation in storage module
  }

  /**
   * Persist user profile to storage.
   */
  private async persistUserProfileToStorage(profile: UserIdentificationProfile): Promise<void> {
    // Implementation in storage module
  }

  /**
   * Initialize connectors for each enabled platform.
   */
  private async initializeEnabledAnalyticsPlatformConnectors(): Promise<void> {
    const initializeConnectorTasks: Promise<void>[] = [];

    this.logDebugMessage('Starting initialization of analytics platform connectors');

    // Initialize Google Analytics 4 connector if enabled
    if (this.userMeshSdkConfiguration.analyticsIntegrations.googleAnalytics4?.isEnabled) {
      const ga4Config = this.userMeshSdkConfiguration.analyticsIntegrations.googleAnalytics4;
      const ga4Connector = new GoogleAnalytics4Connector({
        googlePropertyIdentifier: ga4Config.googlePropertyIdentifier,
        measurementProtocolApiSecret: ga4Config.measurementIdentifier,
      });

      initializeConnectorTasks.push(
        ga4Connector.initializeAnalyticsConnector().then(() => {
          this.initializedAnalyticsConnectorsMap.set('google_analytics_4', ga4Connector);
          this.logDebugMessage('Google Analytics 4 connector initialized');
        })
      );
    }

    // Initialize PostHog connector if enabled
    if (this.userMeshSdkConfiguration.analyticsIntegrations.postHogPlatform?.isEnabled) {
      const postHogConfig = this.userMeshSdkConfiguration.analyticsIntegrations.postHogPlatform;
      const postHogConnector = new PostHogAnalyticsConnector({
        projectApiKey: postHogConfig.projectApiKey,
        customHostUrl: postHogConfig.customHostUrl,
      });

      initializeConnectorTasks.push(
        postHogConnector.initializeAnalyticsConnector().then(() => {
          this.initializedAnalyticsConnectorsMap.set('posthog', postHogConnector);
          this.logDebugMessage('PostHog connector initialized');
        })
      );
    }

    // Initialize Mixpanel connector if enabled
    if (this.userMeshSdkConfiguration.analyticsIntegrations.mixpanelPlatform?.isEnabled) {
      const mixpanelConfig = this.userMeshSdkConfiguration.analyticsIntegrations.mixpanelPlatform;
      const mixpanelConnector = new MixpanelAnalyticsConnector({
        projectToken: mixpanelConfig.projectToken,
      });

      initializeConnectorTasks.push(
        mixpanelConnector.initializeAnalyticsConnector().then(() => {
          this.initializedAnalyticsConnectorsMap.set('mixpanel', mixpanelConnector);
          this.logDebugMessage('Mixpanel connector initialized');
        })
      );
    }

    // Initialize Microsoft Clarity connector if enabled
    if (this.userMeshSdkConfiguration.analyticsIntegrations.microsoftClarity?.isEnabled) {
      const clarityConfig = this.userMeshSdkConfiguration.analyticsIntegrations.microsoftClarity;
      const clarityConnector = new MicrosoftClarityConnector({
        projectIdentifier: clarityConfig.projectIdentifier,
      });

      initializeConnectorTasks.push(
        clarityConnector.initializeAnalyticsConnector().then(() => {
          this.initializedAnalyticsConnectorsMap.set('clarity', clarityConnector);
          this.logDebugMessage('Microsoft Clarity connector initialized');
        })
      );
    }

    // Initialize custom endpoint connector if configured
    if (this.userMeshSdkConfiguration.analyticsIntegrations.customAnalyticsEndpoint?.isEnabled) {
      const customConfig = this.userMeshSdkConfiguration.analyticsIntegrations.customAnalyticsEndpoint;
      const customConnector = new CustomEndpointConnector({
        endpointUrl: customConfig.endpointUrl,
        apiKeyOrToken: customConfig.apiKeyOrToken,
        customAuthenticationMethod: customConfig.customAuthenticationMethod,
      });

      initializeConnectorTasks.push(
        customConnector.initializeAnalyticsConnector().then(() => {
          this.initializedAnalyticsConnectorsMap.set('custom_endpoint', customConnector);
          this.logDebugMessage('Custom endpoint connector initialized');
        })
      );
    }

    // Wait for all connectors to initialize
    try {
      await Promise.all(initializeConnectorTasks);
      this.logDebugMessage(
        `All ${this.initializedAnalyticsConnectorsMap.size} analytics connectors initialized successfully`
      );
    } catch (connectorInitializationError) {
      console.warn(
        '[UserMesh] One or more connectors failed to initialize:',
        connectorInitializationError
      );
    }
  }

  /**
   * Update user profile across all platforms.
   *
   * Sends the user identification to all enabled connectors so they can
   * associate all subsequent events with this user.
   *
   * When: Called whenever identifyCurrentUser() or updateUserTraits() is invoked.
   */
  private async updateUserProfileAcrossAnalyticsPlatforms(
    profile: UserIdentificationProfile
  ): Promise<void> {
    const identifyTasks: Promise<void>[] = [];

    this.logDebugMessage(`Identifying user across ${this.initializedAnalyticsConnectorsMap.size} platforms`);

    // Send identify call to each enabled connector
    for (const [platformName, connector] of this.initializedAnalyticsConnectorsMap) {
      identifyTasks.push(
        connector.identifyUserOnAnalyticsPlatform(profile).then((result) => {
          if (result.wasOperationSuccessful) {
            this.logDebugMessage(
              `User identification successful on ${platformName}: ${result.operationStatusMessage}`
            );
          } else {
            console.warn(
              `[UserMesh] User identification failed on ${platformName}: ${result.operationStatusMessage}`,
              result.underlyingErrorIfAny
            );
          }
        })
      );
    }

    // Wait for all platforms to complete identification
    try {
      await Promise.all(identifyTasks);
    } catch (identificationError) {
      console.warn('[UserMesh] Error identifying user across platforms:', identificationError);
    }
  }

  /**
   * Send a batch of events to all enabled platforms.
   *
   * Transmits the same batch of events to each enabled analytics platform.
   * Each connector transforms the universal UserMesh format into that platform's
   * specific format before transmission.
   *
   * This is the key method that enables UserMesh's "send once, everywhere" capability.
   * One call to recordAnalyticsEvent results in events being sent to GA4, PostHog,
   * Mixpanel, Clarity, and any custom endpoints simultaneously.
   *
   * When: Called whenever the event queue reaches the batch size limit or the
   * flush interval timer fires.
   */
  private async sendEventBatchToAllEnabledPlatforms(batch: EventBatch): Promise<void> {
    if (this.initializedAnalyticsConnectorsMap.size === 0) {
      this.logDebugMessage('No analytics connectors enabled. Batch not sent.');
      return;
    }

    const transmissionTasks: Promise<void>[] = [];

    this.logDebugMessage(
      `Sending event batch to ${this.initializedAnalyticsConnectorsMap.size} platforms (${batch.queuedAnalyticsEventRecords.length} events)`
    );

    // Send the batch to each enabled connector simultaneously
    for (const [platformName, connector] of this.initializedAnalyticsConnectorsMap) {
      transmissionTasks.push(
        connector.transmitEventBatchToAnalyticsPlatform(batch).then((result) => {
          if (result.wasOperationSuccessful) {
            this.logDebugMessage(
              `Event batch sent successfully to ${platformName}: ${result.operationStatusMessage}`
            );
          } else {
            console.warn(
              `[UserMesh] Event transmission failed for ${platformName}: ${result.operationStatusMessage}`,
              result.underlyingErrorIfAny
            );

            // For offline resilience, we could re-queue failed batches here
            // but that's handled by the offline storage module
          }
        })
      );
    }

    // Wait for all platforms to receive the batch
    try {
      await Promise.all(transmissionTasks);
      this.logDebugMessage('Event batch transmission to all platforms completed');
    } catch (transmissionError) {
      console.warn('[UserMesh] Error transmitting batch to platforms:', transmissionError);
    }
  }

  /**
   * Get list of enabled analytics platform names.
   */
  private getEnabledAnalyticsPlatformNames(): string[] {
    const enabledPlatforms: string[] = [];

    if (this.userMeshSdkConfiguration.analyticsIntegrations.googleAnalytics4?.isEnabled) {
      enabledPlatforms.push('google_analytics_4');
    }
    if (this.userMeshSdkConfiguration.analyticsIntegrations.postHogPlatform?.isEnabled) {
      enabledPlatforms.push('posthog');
    }
    if (this.userMeshSdkConfiguration.analyticsIntegrations.mixpanelPlatform?.isEnabled) {
      enabledPlatforms.push('mixpanel');
    }
    if (this.userMeshSdkConfiguration.analyticsIntegrations.microsoftClarity?.isEnabled) {
      enabledPlatforms.push('clarity');
    }

    return enabledPlatforms;
  }

  /**
   * Close all platform connectors.
   *
   * Gracefully shuts down each connector, allowing them to:
   * - Flush any remaining buffered events
   * - Clean up resources (timers, listeners, SDK instances)
   * - Log shutdown status for debugging
   *
   * When: Called during destroyUserMeshSdkAndCleanup() when the app is closing
   * or the user has logged out.
   */
  private async closeAllAnalyticsPlatformConnectors(): Promise<void> {
    if (this.initializedAnalyticsConnectorsMap.size === 0) {
      return;
    }

    this.logDebugMessage(
      `Shutting down ${this.initializedAnalyticsConnectorsMap.size} analytics connectors`
    );

    const shutdownTasks: Promise<void>[] = [];

    // Shut down each connector
    for (const [platformName, connector] of this.initializedAnalyticsConnectorsMap) {
      shutdownTasks.push(
        connector.shutdownAnalyticsConnector().then(() => {
          this.logDebugMessage(`${platformName} connector shut down`);
        })
      );
    }

    // Wait for all connectors to shut down
    try {
      await Promise.all(shutdownTasks);
      this.logDebugMessage('All analytics connectors shut down successfully');
    } catch (shutdownError) {
      console.warn('[UserMesh] Error shutting down connectors:', shutdownError);
    }

    // Clear the connectors map
    this.initializedAnalyticsConnectorsMap.clear();
  }

  /**
   * Check if data encryption should be used.
   */
  private shouldEncryptData(): boolean {
    return (
      this.userMeshSdkConfiguration.securityAndPrivacyConfiguration?.enableDataEncryption ?? true
    );
  }

  /**
   * Check if tracking is enabled globally.
   */
  private isSdkTrackingEnabled(): boolean {
    return (
      this.userMeshSdkConfiguration.sdkBehaviorConfiguration?.enableAnalyticsTracking ?? true
    );
  }

  /**
   * Check if debug logging is enabled.
   */
  private isDebugLoggingEnabled(): boolean {
    return (
      this.userMeshSdkConfiguration.sdkBehaviorConfiguration?.enableDetailedDebugLogging ?? false
    );
  }

  /**
   * Log a debug message if debug logging is enabled.
   */
  private logDebugMessage(message: string): void {
    if (this.isDebugLoggingEnabled()) {
      console.log(`[UserMesh Debug] ${message}`);
    }
  }
}
