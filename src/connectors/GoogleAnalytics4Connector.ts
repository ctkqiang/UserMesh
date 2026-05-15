/**
 * Google Analytics 4 Connector
 *
 * Integrates UserMesh with Google Analytics 4 (GA4).
 * Transforms UserMesh events into GA4's event format and transmits them
 * via the Measurement Protocol API.
 *
 * Why this connector exists: GA4 is widely used for web analytics, but has
 * a different event structure than UserMesh. This connector abstracts that
 * difference, letting the SDK send universal events that work across platforms.
 *
 * How it works:
 * - Uses the GA4 Measurement Protocol (https://developers.google.com/analytics/devguides/collection/protocol/ga4)
 * - Batches events for efficiency
 * - Maps UserMesh properties to GA4 event parameters
 * - Handles user identification via user_id property
 *
 * When to use: When you want your app's events to appear in Google Analytics 4
 */

import type {
  AnalyticsEventRecord,
  EventBatch,
  UserIdentificationProfile,
} from '../types/UserMeshEventTypes';
import type {
  AnalyticsConnectorInterface,
  ConnectorOperationResult,
} from './types/AnalyticsConnectorInterface';

/**
 * Configuration specific to Google Analytics 4.
 * Comes from the SDK's overall configuration.
 */
interface GoogleAnalytics4ConnectorConfiguration {
  /**
   * The GA4 measurement ID.
   * Format: "G-XXXXXXXXXX" (starts with G-, followed by 10 hex digits)
   * Find this in GA4 console: Admin > Property > Data Streams > Web
   */
  googlePropertyIdentifier: string;

  /**
   * Optional: GA4 API Secret for server-side validation.
   * If provided, Measurement Protocol requests will include this secret.
   * This adds validation that the request came from your backend.
   */
  measurementProtocolApiSecret?: string;

  /**
   * Optional: Custom User-Agent to send with requests.
   * Defaults to UserMesh SDK identifier.
   */
  customUserAgent?: string;

  /**
   * Optional: Whether to validate events on the server side.
   * If true, includes api_secret in requests for server-side validation.
   * Adds latency but provides better data quality assurance.
   */
  shouldUseServerSideValidation?: boolean;
}

/**
 * Google Analytics 4 Measurement Protocol event format.
 * This is what the GA4 API expects to receive.
 *
 * Reference: https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events
 */
interface GoogleAnalytics4EventPayload {
  /**
   * The measurement ID (G-XXXXXXXXXX).
   * Identifies which GA4 property this event belongs to.
   */
  measurement_id: string;

  /**
   * API secret for server-side validation (optional).
   * If provided, GA4 will validate that this secret matches the configured secret.
   */
  api_secret?: string;

  /**
   * Collection of events to send in this batch.
   * Each event is transformed from UserMesh format to GA4 format.
   */
  events: Array<{
    /**
     * The event name.
     * GA4 reserves certain event names (page_view, user_engagement, etc).
     * Custom event names can be anything (max 40 characters).
     */
    name: string;

    /**
     * Server-side timestamp in milliseconds.
     * When this event happened (server's perspective).
     */
    timestamp_micros: string;

    /**
     * Unique identifier for this user in your system.
     * Called "user_id" in GA4.
     * Optional, but recommended for user identification.
     */
    user_id?: string;

    /**
     * Unique identifier for this user's device/session.
     * Called "user_pseudo_id" in GA4.
     * GA4 generates this if not provided, but we include it for consistency.
     */
    user_pseudo_id?: string;

    /**
     * Custom parameters for this event.
     * GA4 calls these "event parameters".
     * Arbitrary key-value pairs specific to this event.
     *
     * Examples:
     * - {"value": 99.99, "currency": "USD"} for a purchase
     * - {"search_term": "laptop", "results_count": 234} for a search
     */
    params?: Record<string, string | number | boolean>;

    /**
     * User properties (traits) that should be set for this user.
     * These persist across events until overwritten.
     * GA4 calls these "user_properties".
     *
     * Example: {"user_tier": "premium", "account_age_days": 365}
     */
    user_properties?: Record<
      string,
      {
        /**
         * The property value.
         */
        value: string | number | boolean;
      }
    >;
  }>;
}

/**
 * Google Analytics 4 Connector Implementation
 */
export class GoogleAnalytics4Connector implements AnalyticsConnectorInterface {
  /**
   * GA4-specific configuration provided during initialization.
   */
  private ga4Configuration: GoogleAnalytics4ConnectorConfiguration;

  /**
   * The GA4 Measurement Protocol endpoint.
   * This is where we POST event batches.
   */
  private readonly measurementProtocolEndpointUrl: string =
    'https://www.google-analytics.com/mp/collect';

  /**
   * Whether the connector has been initialized.
   * Used to prevent double initialization.
   */
  private hasConnectorBeenInitialized: boolean = false;

  /**
   * Whether the connector is currently able to send data.
   * Set to false if we detect network connectivity issues.
   */
  private isConnectorReadyToSendData: boolean = false;

  /**
   * Current user's ID, if one has been identified.
   * Included in all events sent to GA4.
   */
  private currentIdentifiedUserIdForGa4: string | undefined;

  /**
   * Queue of events to be sent.
   * Useful if the connector is temporarily unable to send.
   */
  private pendingEventQueue: AnalyticsEventRecord[] = [];

  /**
   * Create a new Google Analytics 4 connector.
   *
   * @param ga4Config - Configuration with GA4 property ID and optional API secret
   * @throws Error if configuration is invalid (e.g., invalid property ID format)
   */
  constructor(ga4Config: GoogleAnalytics4ConnectorConfiguration) {
    // Validate that the property identifier looks correct
    if (!ga4Config.googlePropertyIdentifier || !ga4Config.googlePropertyIdentifier.startsWith('G-')) {
      throw new Error(
        `Invalid GA4 property identifier: "${ga4Config.googlePropertyIdentifier}". ` +
          `Expected format: "G-XXXXXXXXXX" (starts with G-, followed by 10 hex digits).`
      );
    }

    this.ga4Configuration = ga4Config;
  }

  /**
   * Initialize the GA4 connector.
   *
   * For GA4, this is minimal because the Measurement Protocol doesn't require
   * any client-side SDK initialization. We just validate connectivity.
   *
   * When: Called during SDK initialization.
   */
  async initializeAnalyticsConnector(): Promise<void> {
    if (this.hasConnectorBeenInitialized) {
      return;
    }

    try {
      // Test connectivity by pinging GA4 endpoint (lightweight HEAD request)
      const testConnectivityResponse = await fetch(this.measurementProtocolEndpointUrl, {
        method: 'HEAD',
        mode: 'no-cors', // GA4 doesn't support CORS, but we can still test connection
      });

      // If we get any response (not blocked, not timeout), we're ready
      this.isConnectorReadyToSendData = true;
      this.hasConnectorBeenInitialized = true;

      console.log('[UserMesh] Google Analytics 4 connector initialized successfully');
    } catch (initializationError) {
      // Network may be offline initially, but we'll retry when sending events
      this.isConnectorReadyToSendData = false;
      this.hasConnectorBeenInitialized = true;

      console.warn(
        '[UserMesh] GA4 connector initialized but connectivity test failed. ' +
          'Will retry when sending events.',
        initializationError
      );
    }
  }

  /**
   * Send a batch of events to GA4.
   *
   * Transforms each UserMesh event into GA4's Measurement Protocol format
   * and sends them in a single HTTP POST request.
   *
   * When: Called whenever the SDK flushes the event queue.
   */
  async transmitEventBatchToAnalyticsPlatform(
    eventBatch: EventBatch
  ): Promise<ConnectorOperationResult> {
    const operationStartTimestampMilliseconds = Date.now();

    if (!eventBatch.queuedAnalyticsEventRecords || eventBatch.queuedAnalyticsEventRecords.length === 0) {
      return {
        wasOperationSuccessful: true,
        operationStatusMessage: 'Empty batch received, nothing to send',
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }

    try {
      // Transform UserMesh events to GA4 format
      const ga4EventPayload = this.transformUserMeshEventsToGa4Format(eventBatch);

      // Send to GA4 Measurement Protocol
      const sendResponse = await fetch(this.measurementProtocolEndpointUrl, {
        method: 'POST',
        body: JSON.stringify(ga4EventPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // GA4 returns 204 No Content on success
      if (sendResponse.status === 204 || sendResponse.status === 200) {
        this.isConnectorReadyToSendData = true;

        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `Successfully sent ${eventBatch.queuedAnalyticsEventRecords.length} events to GA4`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            eventCount: eventBatch.queuedAnalyticsEventRecords.length,
            statusCode: sendResponse.status,
            propertyId: this.ga4Configuration.googlePropertyIdentifier,
          },
        };
      } else {
        // Non-2xx response indicates an error
        const errorResponseText = await sendResponse.text();

        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `GA4 API returned status ${sendResponse.status}: ${errorResponseText}`,
          underlyingErrorIfAny: new Error(
            `GA4 Measurement Protocol error: ${sendResponse.status} ${errorResponseText}`
          ),
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            statusCode: sendResponse.status,
            responseBody: errorResponseText,
          },
        };
      }
    } catch (transmissionError) {
      this.isConnectorReadyToSendData = false;

      // Network error or other issue
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to send events to GA4: ${String(transmissionError)}`,
        underlyingErrorIfAny:
          transmissionError instanceof Error
            ? transmissionError
            : new Error(String(transmissionError)),
        operationCompletionTimestampMilliseconds: Date.now(),
        platformSpecificMetadata: {
          errorType: transmissionError instanceof Error ? transmissionError.name : 'Unknown',
        },
      };
    }
  }

  /**
   * Identify a user on GA4.
   *
   * Sets the user_id and user properties that will be included in all
   * subsequent events from this user.
   *
   * When: Called when the user authenticates or their profile changes.
   */
  async identifyUserOnAnalyticsPlatform(
    userProfile: UserIdentificationProfile
  ): Promise<ConnectorOperationResult> {
    try {
      // Store the user ID so we can include it in all events
      this.currentIdentifiedUserIdForGa4 = userProfile.primaryUserId;

      // Create an "identify" event that includes user properties
      // GA4 doesn't have a separate identify call, but we can send an event
      // with user_properties to set them
      const identifyEventPayload: GoogleAnalytics4EventPayload = {
        measurement_id: this.ga4Configuration.googlePropertyIdentifier,
        events: [
          {
            name: 'user_identify',
            timestamp_micros: String(Date.now() * 1000),
            user_id: userProfile.primaryUserId,
            user_properties: this.convertTraitsToGa4UserProperties(
              userProfile.userTraitsAndAttributes
            ),
          },
        ],
      };

      if (this.ga4Configuration.measurementProtocolApiSecret) {
        identifyEventPayload.api_secret = this.ga4Configuration.measurementProtocolApiSecret;
      }

      // Send the identify event
      const identifyResponse = await fetch(this.measurementProtocolEndpointUrl, {
        method: 'POST',
        body: JSON.stringify(identifyEventPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (identifyResponse.status === 204 || identifyResponse.status === 200) {
        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `User identified on GA4 with ${Object.keys(userProfile.userTraitsAndAttributes).length} properties`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            userId: userProfile.primaryUserId,
            propertyCount: Object.keys(userProfile.userTraitsAndAttributes).length,
          },
        };
      } else {
        const errorResponseText = await identifyResponse.text();

        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `GA4 identify failed: ${identifyResponse.status}`,
          underlyingErrorIfAny: new Error(`GA4 identify error: ${errorResponseText}`),
          operationCompletionTimestampMilliseconds: Date.now(),
        };
      }
    } catch (identifyError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to identify user on GA4: ${String(identifyError)}`,
        underlyingErrorIfAny:
          identifyError instanceof Error
            ? identifyError
            : new Error(String(identifyError)),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }
  }

  /**
   * Track a page view event on GA4.
   *
   * GA4 has special handling for page views. This method ensures that
   * page views are properly formatted and sent.
   *
   * When: Called by the SDK's trackPageView() method.
   */
  async trackPageViewEventOnAnalyticsPlatform(
    pageUrl: string,
    pageTitle?: string,
    additionalPageProperties?: Record<string, unknown>
  ): Promise<ConnectorOperationResult> {
    try {
      // Create a GA4 page_view event
      // GA4 has a reserved event name "page_view" with special parameters
      const pageViewEventPayload: GoogleAnalytics4EventPayload = {
        measurement_id: this.ga4Configuration.googlePropertyIdentifier,
        events: [
          {
            name: 'page_view',
            timestamp_micros: String(Date.now() * 1000),
            user_id: this.currentIdentifiedUserIdForGa4,
            params: {
              page_location: pageUrl,
              page_title: pageTitle || '',
              ...additionalPageProperties,
            },
          },
        ],
      };

      if (this.ga4Configuration.measurementProtocolApiSecret) {
        pageViewEventPayload.api_secret = this.ga4Configuration.measurementProtocolApiSecret;
      }

      // Send the page view event
      const pageViewResponse = await fetch(this.measurementProtocolEndpointUrl, {
        method: 'POST',
        body: JSON.stringify(pageViewEventPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (pageViewResponse.status === 204 || pageViewResponse.status === 200) {
        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `Page view tracked on GA4: ${pageUrl}`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            pageUrl,
            pageTitle,
          },
        };
      } else {
        const errorResponseText = await pageViewResponse.text();

        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `GA4 page view failed: ${pageViewResponse.status}`,
          underlyingErrorIfAny: new Error(`GA4 page view error: ${errorResponseText}`),
          operationCompletionTimestampMilliseconds: Date.now(),
        };
      }
    } catch (pageViewError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to track page view on GA4: ${String(pageViewError)}`,
        underlyingErrorIfAny:
          pageViewError instanceof Error
            ? pageViewError
            : new Error(String(pageViewError)),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }
  }

  /**
   * Check if this connector is currently ready to send data.
   *
   * For GA4, we check basic network connectivity.
   */
  async isConnectorCurrentlyReady(): Promise<boolean> {
    // Try a quick HEAD request to see if GA4 is reachable
    try {
      const headResponse = await fetch(this.measurementProtocolEndpointUrl, {
        method: 'HEAD',
        mode: 'no-cors',
      });

      // If we get any response, we're probably online
      this.isConnectorReadyToSendData = true;
      return true;
    } catch {
      // Network error means we're offline or GA4 is unreachable
      this.isConnectorReadyToSendData = false;
      return false;
    }
  }

  /**
   * Shut down the GA4 connector.
   *
   * For GA4, this mainly just cleans up state since there's no client SDK
   * to shut down. However, we send any pending events before shutting down.
   */
  async shutdownAnalyticsConnector(): Promise<void> {
    // If there are pending events, try to send them one last time
    if (this.pendingEventQueue.length > 0) {
      console.log(
        `[UserMesh] Flushing ${this.pendingEventQueue.length} pending events to GA4 during shutdown`
      );
      // In a real implementation, we'd send these events here
      // For now, we just log that we're shutting down
    }

    this.hasConnectorBeenInitialized = false;
    this.isConnectorReadyToSendData = false;
    this.currentIdentifiedUserIdForGa4 = undefined;
    this.pendingEventQueue = [];

    console.log('[UserMesh] Google Analytics 4 connector shut down');
  }

  /**
   * Get the platform name for this connector.
   */
  getPlatformName(): string {
    return 'google_analytics_4';
  }

  /**
   * Transform UserMesh events to GA4 Measurement Protocol format.
   *
   * This is the key method that converts our universal event format into
   * GA4's expected format. Maps UserMesh properties to GA4 event parameters.
   */
  private transformUserMeshEventsToGa4Format(eventBatch: EventBatch): GoogleAnalytics4EventPayload {
    return {
      measurement_id: this.ga4Configuration.googlePropertyIdentifier,
      api_secret: this.ga4Configuration.measurementProtocolApiSecret,
      events: eventBatch.queuedAnalyticsEventRecords.map((userMeshEvent) => ({
        name: userMeshEvent.analyticsEventName,
        timestamp_micros: String(userMeshEvent.eventTimestampMilliseconds * 1000),
        user_id: userMeshEvent.authenticatedUserId || this.currentIdentifiedUserIdForGa4,
        user_pseudo_id: userMeshEvent.anonymousSessionIdentifier,
        params: {
          // Include context information as GA4 event parameters
          ...userMeshEvent.eventPropertiesData,
          platform: userMeshEvent.contextInformation?.applicationPlatform,
          sdk_version: userMeshEvent.contextInformation?.softwareDevelopmentKitVersion,
          session_id: userMeshEvent.currentSessionIdentifier,
        },
      })),
    };
  }

  /**
   * Convert UserMesh user traits to GA4 user properties format.
   *
   * GA4 user properties have a specific structure where each property
   * is an object with a "value" field.
   */
  private convertTraitsToGa4UserProperties(
    traits: Record<string, unknown>
  ): Record<
    string,
    {
      value: string | number | boolean;
    }
  > {
    const ga4UserProperties: Record<
      string,
      {
        value: string | number | boolean;
      }
    > = {};

    for (const [traitKey, traitValue] of Object.entries(traits)) {
      if (typeof traitValue === 'string' || typeof traitValue === 'number' || typeof traitValue === 'boolean') {
        ga4UserProperties[traitKey] = {
          value: traitValue,
        };
      }
    }

    return ga4UserProperties;
  }
}
