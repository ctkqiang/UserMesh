/**
 * Mixpanel Analytics Connector
 *
 * Integrates UserMesh with Mixpanel event analytics platform.
 * Mixpanel specializes in product analytics, user retention, and funnel analysis
 * with a powerful query builder and cohort analysis.
 *
 * Why this connector: Mixpanel has a simpler API than GA4 but different concepts
 * than PostHog. It focuses on user properties and event tracking with built-in
 * funnel and retention analysis. This connector translates UserMesh events to
 * Mixpanel's format.
 *
 * How it works:
 * - Uses Mixpanel's Track API endpoint for bulk event import
 * - Maps UserMesh events to Mixpanel event format
 * - Handles user identification via the Engage API for user properties
 * - Includes automatic session tracking
 *
 * When to use: When you want powerful funnel analysis, retention cohorts,
 * or advanced user segmentation
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
 * Configuration specific to Mixpanel integration.
 */
interface MixpanelConnectorConfiguration {
  /**
   * The Mixpanel project token.
   * Format: A hex string like "1234567890abcdef1234567890abcdef"
   * Find this in Mixpanel: Settings > Project Token
   */
  projectToken: string;

  /**
   * Optional: Custom Mixpanel server URL for self-hosted instances.
   * Default: "https://api.mixpanel.com"
   * For self-hosted: Your custom domain like "https://mixpanel.yourcompany.com"
   */
  customServerUrl?: string;

  /**
   * Optional: Whether to use the compression endpoint (gzip).
   * If true, uses /track?compression=gzip for smaller payloads.
   * Default: false (no compression)
   */
  shouldUseCompression?: boolean;

  /**
   * Optional: Custom timestamp format.
   * Default: Unix timestamp in seconds
   * Mixpanel expects Unix timestamp in seconds (not milliseconds).
   */
  customTimestampFormat?: 'seconds' | 'milliseconds';
}

/**
 * Mixpanel Track API event format.
 * This is what Mixpanel's Track API expects.
 *
 * Reference: https://docs.mixpanel.com/docs/tracking-best-practices/api
 */
interface MixpanelTrackApiPayload {
  /**
   * The unique user identifier.
   * Called "distinct_id" in Mixpanel terminology.
   * Can be a user ID, email, or any unique identifier per user.
   */
  distinct_id: string;

  /**
   * The event name.
   * Examples: "user_signup", "purchase_completed", "feature_viewed"
   * Can be any string, but consistency is important for analysis.
   */
  event: string;

  /**
   * Custom properties for this event.
   * Can be any key-value pairs relevant to your event.
   * These are included in the event analysis and funnels.
   * Examples: {"amount": 99.99, "product_id": "SKU123", "currency": "USD"}
   */
  properties: {
    /**
     * The Mixpanel project token.
     * Required for authentication and routing to the correct project.
     */
    token: string;

    /**
     * Unix timestamp (in seconds) when this event occurred.
     * If not provided, Mixpanel uses the server's current time.
     */
    time?: number;

    /**
     * Custom properties specific to this event.
     * These are merged with the time and token properties.
     * [Additional event-specific properties go here]
     */
    [key: string]: unknown;
  };
}

/**
 * Mixpanel Engage API (user properties) payload format.
 * Used for setting user traits that persist across events.
 *
 * Reference: https://docs.mixpanel.com/docs/tracking-best-practices/engage-api
 */
interface MixpanelEngageApiPayload {
  /**
   * The unique user identifier.
   */
  $distinct_id: string;

  /**
   * User properties that should be set for this user.
   * These persist across events and can be used for segmentation.
   * Examples: {"$email": "user@example.com", "account_type": "premium"}
   *
   * Reserved properties start with $:
   * - $email: User's email address
   * - $name: User's name
   * - $phone: User's phone number
   * - $created: Account creation date
   * - $last_seen: Timestamp of last activity (automatically managed by Mixpanel)
   */
  $set: Record<string, unknown>;

  /**
   * The Mixpanel project token for authentication.
   */
  $token: string;
}

/**
 * Mixpanel Connector Implementation
 */
export class MixpanelAnalyticsConnector implements AnalyticsConnectorInterface {
  /**
   * Mixpanel-specific configuration provided during initialization.
   */
  private mixpanelConfiguration: MixpanelConnectorConfiguration;

  /**
   * The Mixpanel Track API endpoint.
   * This is where event batches are sent.
   */
  private mixpanelTrackApiEndpoint: string;

  /**
   * The Mixpanel Engage API endpoint.
   * This is where user properties are set.
   */
  private mixpanelEngageApiEndpoint: string;

  /**
   * Whether the connector has been initialized.
   */
  private hasConnectorBeenInitialized: boolean = false;

  /**
   * Whether the connector is currently ready to send data.
   */
  private isConnectorReadyToSendData: boolean = false;

  /**
   * Current user's ID, if one has been identified.
   * Included in all events sent to Mixpanel.
   */
  private currentIdentifiedDistinctIdForMixpanel: string | undefined;

  /**
   * Create a new Mixpanel connector.
   *
   * @param mixpanelConfig - Configuration with Mixpanel project token
   * @throws Error if configuration is invalid
   */
  constructor(mixpanelConfig: MixpanelConnectorConfiguration) {
    if (!mixpanelConfig.projectToken) {
      throw new Error(
        'Mixpanel configuration error: projectToken is required. ' +
          'Find this in Mixpanel: Settings > Project Token'
      );
    }

    this.mixpanelConfiguration = mixpanelConfig;

    // Construct the API endpoint URLs
    const serverUrl = mixpanelConfig.customServerUrl || 'https://api.mixpanel.com';
    this.mixpanelTrackApiEndpoint = `${serverUrl}/track`;
    this.mixpanelEngageApiEndpoint = `${serverUrl}/engage`;
  }

  /**
   * Initialize the Mixpanel connector.
   *
   * Validates connectivity to the Mixpanel API endpoint.
   */
  async initializeAnalyticsConnector(): Promise<void> {
    if (this.hasConnectorBeenInitialized) {
      return;
    }

    try {
      // Test connectivity by sending a dummy event
      const testEvent: MixpanelTrackApiPayload = {
        distinct_id: 'usermesh_init_test',
        event: 'usermesh_initialized',
        properties: {
          token: this.mixpanelConfiguration.projectToken,
          time: Math.floor(Date.now() / 1000),
        },
      };

      const testResponse = await fetch(this.mixpanelTrackApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEvent),
      });

      // Mixpanel returns 200 OK for successful events
      if (testResponse.status === 200) {
        this.isConnectorReadyToSendData = true;
      } else {
        this.isConnectorReadyToSendData = false;
      }

      this.hasConnectorBeenInitialized = true;
      console.log('[UserMesh] Mixpanel connector initialized successfully');
    } catch (initializationError) {
      // Network may be offline, but we'll retry when sending events
      this.hasConnectorBeenInitialized = true;
      this.isConnectorReadyToSendData = false;

      console.warn(
        '[UserMesh] Mixpanel connector initialized but connectivity test failed. ' +
          'Will retry when sending events.',
        initializationError
      );
    }
  }

  /**
   * Send a batch of events to Mixpanel.
   *
   * Sends each event individually to Mixpanel Track API
   * (Mixpanel's batch endpoint is available but the individual track endpoint is simpler).
   */
  async transmitEventBatchToAnalyticsPlatform(
    eventBatch: EventBatch
  ): Promise<ConnectorOperationResult> {
    if (!eventBatch.queuedAnalyticsEventRecords || eventBatch.queuedAnalyticsEventRecords.length === 0) {
      return {
        wasOperationSuccessful: true,
        operationStatusMessage: 'Empty batch received, nothing to send',
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }

    try {
      // Send each event individually to Mixpanel
      // Mixpanel's Track API accepts individual events (can also use batch, but this is simpler)
      const sendPromises = eventBatch.queuedAnalyticsEventRecords.map((userMeshEvent) =>
        this.sendEventToMixpanelTrackApi(userMeshEvent)
      );

      const sendResults = await Promise.all(sendPromises);

      // Check if all events were sent successfully
      const allSuccessful = sendResults.every((result) => result.success);
      const successCount = sendResults.filter((r) => r.success).length;

      if (allSuccessful) {
        this.isConnectorReadyToSendData = true;

        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `Successfully sent ${successCount}/${eventBatch.queuedAnalyticsEventRecords.length} events to Mixpanel`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            eventCount: eventBatch.queuedAnalyticsEventRecords.length,
            successCount,
          },
        };
      } else {
        // Some events failed
        const failureCount = sendResults.filter((r) => !r.success).length;
        const failureMessages = sendResults
          .filter((r) => !r.success)
          .map((r) => r.error)
          .join('; ');

        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `Failed to send ${failureCount}/${eventBatch.queuedAnalyticsEventRecords.length} events to Mixpanel: ${failureMessages}`,
          underlyingErrorIfAny: new Error(`Mixpanel transmission errors: ${failureMessages}`),
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            successCount,
            failureCount,
          },
        };
      }
    } catch (transmissionError) {
      this.isConnectorReadyToSendData = false;

      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to send events to Mixpanel: ${String(transmissionError)}`,
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
   * Identify a user on Mixpanel.
   *
   * Sets the user's properties on Mixpanel via the Engage API.
   * These properties persist and are used for user segmentation.
   */
  async identifyUserOnAnalyticsPlatform(
    userProfile: UserIdentificationProfile
  ): Promise<ConnectorOperationResult> {
    try {
      // Store the user ID so we can include it in all events
      this.currentIdentifiedDistinctIdForMixpanel = userProfile.primaryUserId;

      // Prepare user properties
      const userPropertiesForMixpanel: Record<string, unknown> = {
        ...userProfile.userTraitsAndAttributes,
      };

      // Add reserved Mixpanel properties if available
      if (userProfile.emailAddressForUser) {
        userPropertiesForMixpanel.$email = userProfile.emailAddressForUser;
      }
      if (userProfile.phoneNumberForUser) {
        userPropertiesForMixpanel.$phone = userProfile.phoneNumberForUser;
      }

      // Create an Engage API payload to set user properties
      const engagePayload: MixpanelEngageApiPayload = {
        $distinct_id: userProfile.primaryUserId,
        $token: this.mixpanelConfiguration.projectToken,
        $set: userPropertiesForMixpanel,
      };

      // Send to Mixpanel Engage API
      const identifyResponse = await fetch(this.mixpanelEngageApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(engagePayload),
      });

      if (identifyResponse.status === 200) {
        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `User identified on Mixpanel with ${Object.keys(userProfile.userTraitsAndAttributes).length} properties`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            distinctId: userProfile.primaryUserId,
            propertyCount: Object.keys(userProfile.userTraitsAndAttributes).length,
          },
        };
      } else {
        const errorResponseText = await identifyResponse.text();

        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `Mixpanel identify failed: ${identifyResponse.status}`,
          underlyingErrorIfAny: new Error(`Mixpanel identify error: ${errorResponseText}`),
          operationCompletionTimestampMilliseconds: Date.now(),
        };
      }
    } catch (identifyError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to identify user on Mixpanel: ${String(identifyError)}`,
        underlyingErrorIfAny:
          identifyError instanceof Error
            ? identifyError
            : new Error(String(identifyError)),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }
  }

  /**
   * Track a page view event on Mixpanel.
   *
   * Mixpanel doesn't have a reserved page view event, but we send
   * a standard event with page information properties.
   */
  async trackPageViewEventOnAnalyticsPlatform(
    pageUrl: string,
    pageTitle?: string,
    additionalPageProperties?: Record<string, unknown>
  ): Promise<ConnectorOperationResult> {
    try {
      // Create a page_view event for Mixpanel
      const pageViewEvent: MixpanelTrackApiPayload = {
        distinct_id: this.currentIdentifiedDistinctIdForMixpanel || 'anonymous',
        event: 'page_view',
        properties: {
          token: this.mixpanelConfiguration.projectToken,
          time: Math.floor(Date.now() / 1000),
          page_url: pageUrl,
          page_title: pageTitle || '',
          ...additionalPageProperties,
        },
      };

      // Send the page view event
      const pageViewResponse = await fetch(this.mixpanelTrackApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageViewEvent),
      });

      if (pageViewResponse.status === 200) {
        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `Page view tracked on Mixpanel: ${pageUrl}`,
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
          operationStatusMessage: `Mixpanel page view failed: ${pageViewResponse.status}`,
          underlyingErrorIfAny: new Error(`Mixpanel page view error: ${errorResponseText}`),
          operationCompletionTimestampMilliseconds: Date.now(),
        };
      }
    } catch (pageViewError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to track page view on Mixpanel: ${String(pageViewError)}`,
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
   */
  async isConnectorCurrentlyReady(): Promise<boolean> {
    try {
      const healthCheckEvent: MixpanelTrackApiPayload = {
        distinct_id: 'usermesh_health_check',
        event: 'usermesh_health_check',
        properties: {
          token: this.mixpanelConfiguration.projectToken,
          time: Math.floor(Date.now() / 1000),
        },
      };

      const testResponse = await fetch(this.mixpanelTrackApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(healthCheckEvent),
      });

      const isReady = testResponse.status === 200;
      this.isConnectorReadyToSendData = isReady;
      return isReady;
    } catch {
      this.isConnectorReadyToSendData = false;
      return false;
    }
  }

  /**
   * Shut down the Mixpanel connector.
   *
   * For Mixpanel, this mainly just cleans up state.
   */
  async shutdownAnalyticsConnector(): Promise<void> {
    this.hasConnectorBeenInitialized = false;
    this.isConnectorReadyToSendData = false;
    this.currentIdentifiedDistinctIdForMixpanel = undefined;

    console.log('[UserMesh] Mixpanel connector shut down');
  }

  /**
   * Get the platform name for this connector.
   */
  getPlatformName(): string {
    return 'mixpanel';
  }

  /**
   * Send a single event to Mixpanel Track API.
   *
   * Internal helper method used when sending event batches.
   */
  private async sendEventToMixpanelTrackApi(
    userMeshEvent: AnalyticsEventRecord
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const mixpanelEvent: MixpanelTrackApiPayload = {
        distinct_id:
          userMeshEvent.authenticatedUserId ||
          this.currentIdentifiedDistinctIdForMixpanel ||
          'anonymous',
        event: userMeshEvent.analyticsEventName,
        properties: {
          token: this.mixpanelConfiguration.projectToken,
          time: Math.floor(userMeshEvent.eventTimestampMilliseconds / 1000), // Mixpanel expects seconds
          session_id: userMeshEvent.currentSessionIdentifier,
          sdk_version: userMeshEvent.contextInformation?.softwareDevelopmentKitVersion,
          ...userMeshEvent.eventPropertiesData,
        },
      };

      const response = await fetch(this.mixpanelTrackApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mixpanelEvent),
      });

      if (response.status === 200) {
        return { success: true };
      } else {
        const errorText = await response.text();
        return { success: false, error: `Status ${response.status}: ${errorText}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
