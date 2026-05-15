/**
 * PostHog Analytics Connector
 *
 * Integrates UserMesh with PostHog analytics platform.
 * PostHog is a developer-friendly alternative to GA4 that offers event analytics,
 * session recording, and feature flags all in one platform.
 *
 * Why this connector: PostHog has a different API than GA4. While both track events,
 * PostHog uses a simpler JSON API with concepts like "distinct_id" (user identifier)
 * and "properties" (event data). This connector bridges that difference.
 *
 * How it works:
 * - Uses PostHog's Batch API endpoint (for sending multiple events at once)
 * - Supports both cloud-hosted and self-hosted PostHog instances
 * - Maps UserMesh events to PostHog's event format
 * - Includes automatic session tracking
 *
 * When to use: When you want session replay, feature flags, or prefer
 * a more developer-friendly analytics platform
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
 * Configuration specific to PostHog integration.
 */
interface PostHogConnectorConfiguration {
  /**
   * The PostHog API key (project key).
   * Format: Usually a hex string like "phc_1234abcd5678efgh..."
   * Find this in PostHog: Project Settings > API Keys
   */
  projectApiKey: string;

  /**
   * Optional: Custom PostHog host URL for self-hosted instances.
   * Default: "https://us.i.posthog.com" (US cloud)
   * For EU cloud: "https://eu.i.posthog.com"
   * For self-hosted: Your custom domain like "https://posthog.yourcompany.com"
   */
  customHostUrl?: string;

  /**
   * Optional: Whether to include session recording with events.
   * Session recording allows you to watch how users interact with your app.
   * Note: This may increase data usage and have privacy implications.
   */
  shouldEnableSessionRecording?: boolean;

  /**
   * Optional: Custom API version override.
   * PostHog Batch API currently uses v1.
   * Usually you don't need to change this.
   */
  customApiVersion?: string;
}

/**
 * PostHog Batch API request format.
 * This is what PostHog's Batch API endpoint expects.
 *
 * Reference: https://posthog.com/docs/api/batch
 */
interface PostHogBatchApiRequest {
  /**
   * List of events to track in this batch.
   */
  batch: Array<{
    /**
     * The event name (custom event).
     * Examples: "user_signup", "purchase_completed", "feature_used"
     * PostHog also reserves certain event names like "$pageview", "$identify"
     */
    event: string;

    /**
     * Unique identifier for this user in your system.
     * Called "distinct_id" in PostHog's terminology.
     * Can be a user ID, email, or any unique identifier.
     * Required for user identification and session tracking.
     */
    distinct_id: string;

    /**
     * Timestamp when this event happened (milliseconds).
     * If not provided, PostHog uses the current time.
     */
    timestamp?: string;

    /**
     * Custom properties for this event.
     * Can be any key-value pairs relevant to your event.
     * Examples: {"amount": 99.99, "product_id": "SKU123"}
     */
    properties?: Record<string, unknown>;

    /**
     * Optional: Library information for debugging.
     * Helps PostHog identify where events came from.
     * We set this to identify UserMesh as the source.
     */
    library?: {
      name: string;
      version: string;
    };

    /**
     * Optional: User identification properties that should be merged with the user's profile.
     * When you set $set properties, PostHog will merge them with the user's profile.
     * Used for user traits like email, name, subscription tier, etc.
     */
    $set?: Record<string, unknown>;

    /**
     * Optional: User identification properties set only once per user.
     * PostHog won't overwrite these if already set.
     * Useful for immutable properties like "signup_date".
     */
    $set_once?: Record<string, unknown>;
  }>;

  /**
   * The API key for this project.
   * Required for authentication to PostHog.
   */
  api_key: string;
}

/**
 * PostHog Connector Implementation
 */
export class PostHogAnalyticsConnector implements AnalyticsConnectorInterface {
  /**
   * PostHog-specific configuration provided during initialization.
   */
  private postHogConfiguration: PostHogConnectorConfiguration;

  /**
   * The PostHog Batch API endpoint.
   * Dynamically constructed based on the custom host URL if provided.
   */
  private posthogBatchApiEndpoint: string;

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
   * Included in all events sent to PostHog.
   */
  private currentIdentifiedDistinctIdForPosthog: string | undefined;

  /**
   * Current user's traits that will be sent with the next identify event.
   * Accumulates as updateUserTraits() is called.
   */
  private accumulatedUserTraitsForIdentification: Record<string, unknown> = {};

  /**
   * Create a new PostHog connector.
   *
   * @param postHogConfig - Configuration with PostHog API key and optional custom host
   * @throws Error if configuration is invalid
   */
  constructor(postHogConfig: PostHogConnectorConfiguration) {
    if (!postHogConfig.projectApiKey) {
      throw new Error(
        'PostHog configuration error: projectApiKey is required. ' +
          'Find this in PostHog: Project Settings > API Keys'
      );
    }

    this.postHogConfiguration = postHogConfig;

    // Construct the API endpoint URL
    const hostUrl = postHogConfig.customHostUrl || 'https://us.i.posthog.com';
    const apiVersion = postHogConfig.customApiVersion || 'v1';
    this.posthogBatchApiEndpoint = `${hostUrl}/batch/${apiVersion}`;
  }

  /**
   * Initialize the PostHog connector.
   *
   * PostHog doesn't require client-side SDK initialization, so this just
   * validates that we can reach the PostHog endpoint.
   */
  async initializeAnalyticsConnector(): Promise<void> {
    if (this.hasConnectorBeenInitialized) {
      return;
    }

    try {
      // Test connectivity by sending a dummy identify event
      const testConnectivityPayload: PostHogBatchApiRequest = {
        api_key: this.postHogConfiguration.projectApiKey,
        batch: [
          {
            event: '$feature_flag_called',
            distinct_id: 'usermesh_init_test',
            properties: {
              $feature_flag: 'usermesh_connectivity_test',
            },
          },
        ],
      };

      // Don't wait for response, just check if the request goes through
      const testResponse = await fetch(this.posthogBatchApiEndpoint, {
        method: 'POST',
        body: JSON.stringify(testConnectivityPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // PostHog returns 200 OK for successful batch submissions
      if (testResponse.status === 200 || testResponse.status === 201) {
        this.isConnectorReadyToSendData = true;
      } else {
        this.isConnectorReadyToSendData = false;
      }

      this.hasConnectorBeenInitialized = true;
      console.log('[UserMesh] PostHog connector initialized successfully');
    } catch (initializationError) {
      // Network may be offline, but we'll retry when sending events
      this.hasConnectorBeenInitialized = true;
      this.isConnectorReadyToSendData = false;

      console.warn(
        '[UserMesh] PostHog connector initialized but connectivity test failed. ' +
          'Will retry when sending events.',
        initializationError
      );
    }
  }

  /**
   * Send a batch of events to PostHog.
   *
   * Transforms UserMesh events into PostHog's format and submits them
   * via the Batch API for efficient bulk ingestion.
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
      // Transform UserMesh events to PostHog format
      const postHogBatchPayload = this.transformUserMeshEventsToPosthogFormat(eventBatch);

      // Send to PostHog Batch API
      const sendResponse = await fetch(this.posthogBatchApiEndpoint, {
        method: 'POST',
        body: JSON.stringify(postHogBatchPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // PostHog returns 200 OK on success
      if (sendResponse.status === 200 || sendResponse.status === 201) {
        this.isConnectorReadyToSendData = true;

        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `Successfully sent ${eventBatch.queuedAnalyticsEventRecords.length} events to PostHog`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            eventCount: eventBatch.queuedAnalyticsEventRecords.length,
            statusCode: sendResponse.status,
            apiEndpoint: this.posthogBatchApiEndpoint,
          },
        };
      } else {
        // Non-2xx response indicates an error
        const errorResponseText = await sendResponse.text();

        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `PostHog API returned status ${sendResponse.status}`,
          underlyingErrorIfAny: new Error(
            `PostHog Batch API error: ${sendResponse.status} ${errorResponseText}`
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

      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to send events to PostHog: ${String(transmissionError)}`,
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
   * Identify a user on PostHog.
   *
   * PostHog calls this "identify" and it merges user traits with their profile.
   * All subsequent events from this user will be associated with these traits.
   */
  async identifyUserOnAnalyticsPlatform(
    userProfile: UserIdentificationProfile
  ): Promise<ConnectorOperationResult> {
    try {
      // Store the user ID so we can include it in all events
      this.currentIdentifiedDistinctIdForPosthog = userProfile.primaryUserId;

      // Store the traits for the identify event
      this.accumulatedUserTraitsForIdentification = userProfile.userTraitsAndAttributes;

      // Create a PostHog identify event
      // PostHog uses the special event name "$identify" for user identification
      const identifyEventPayload: PostHogBatchApiRequest = {
        api_key: this.postHogConfiguration.projectApiKey,
        batch: [
          {
            event: '$identify',
            distinct_id: userProfile.primaryUserId,
            timestamp: new Date().toISOString(),
            $set: userProfile.userTraitsAndAttributes,
            properties: {
              // Include email and phone if available
              $email: userProfile.emailAddressForUser,
              $phone: userProfile.phoneNumberForUser,
            },
          },
        ],
      };

      // Send the identify event
      const identifyResponse = await fetch(this.posthogBatchApiEndpoint, {
        method: 'POST',
        body: JSON.stringify(identifyEventPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (identifyResponse.status === 200 || identifyResponse.status === 201) {
        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `User identified on PostHog with ${Object.keys(userProfile.userTraitsAndAttributes).length} properties`,
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
          operationStatusMessage: `PostHog identify failed: ${identifyResponse.status}`,
          underlyingErrorIfAny: new Error(`PostHog identify error: ${errorResponseText}`),
          operationCompletionTimestampMilliseconds: Date.now(),
        };
      }
    } catch (identifyError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to identify user on PostHog: ${String(identifyError)}`,
        underlyingErrorIfAny:
          identifyError instanceof Error
            ? identifyError
            : new Error(String(identifyError)),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }
  }

  /**
   * Track a page view event on PostHog.
   *
   * PostHog has a reserved event name "$pageview" for page views.
   * This method ensures proper formatting for page view tracking.
   */
  async trackPageViewEventOnAnalyticsPlatform(
    pageUrl: string,
    pageTitle?: string,
    additionalPageProperties?: Record<string, unknown>
  ): Promise<ConnectorOperationResult> {
    try {
      // Create a PostHog page view event
      const pageViewEventPayload: PostHogBatchApiRequest = {
        api_key: this.postHogConfiguration.projectApiKey,
        batch: [
          {
            event: '$pageview',
            distinct_id: this.currentIdentifiedDistinctIdForPosthog || 'anonymous',
            timestamp: new Date().toISOString(),
            properties: {
              $current_url: pageUrl,
              $pathname: new URL(pageUrl, 'http://localhost').pathname,
              $host: new URL(pageUrl, 'http://localhost').hostname,
              $page_title: pageTitle || '',
              ...additionalPageProperties,
            },
          },
        ],
      };

      // Send the page view event
      const pageViewResponse = await fetch(this.posthogBatchApiEndpoint, {
        method: 'POST',
        body: JSON.stringify(pageViewEventPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (pageViewResponse.status === 200 || pageViewResponse.status === 201) {
        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `Page view tracked on PostHog: ${pageUrl}`,
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
          operationStatusMessage: `PostHog page view failed: ${pageViewResponse.status}`,
          underlyingErrorIfAny: new Error(`PostHog page view error: ${errorResponseText}`),
          operationCompletionTimestampMilliseconds: Date.now(),
        };
      }
    } catch (pageViewError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to track page view on PostHog: ${String(pageViewError)}`,
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
    // Try a lightweight request to see if PostHog is reachable
    try {
      const testPayload: PostHogBatchApiRequest = {
        api_key: this.postHogConfiguration.projectApiKey,
        batch: [
          {
            event: '$health_check',
            distinct_id: 'usermesh_health_check',
          },
        ],
      };

      const testResponse = await fetch(this.posthogBatchApiEndpoint, {
        method: 'POST',
        body: JSON.stringify(testPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If we get any 2xx response, we're ready
      const isReady = testResponse.status >= 200 && testResponse.status < 300;
      this.isConnectorReadyToSendData = isReady;
      return isReady;
    } catch {
      // Network error
      this.isConnectorReadyToSendData = false;
      return false;
    }
  }

  /**
   * Shut down the PostHog connector.
   *
   * For PostHog, this mainly just cleans up state since there's no client
   * SDK to shut down. However, we flush any pending user trait updates.
   */
  async shutdownAnalyticsConnector(): Promise<void> {
    // If there are accumulated traits that haven't been sent, send them now
    if (
      this.currentIdentifiedDistinctIdForPosthog &&
      Object.keys(this.accumulatedUserTraitsForIdentification).length > 0
    ) {
      const finalIdentifyPayload: PostHogBatchApiRequest = {
        api_key: this.postHogConfiguration.projectApiKey,
        batch: [
          {
            event: '$identify',
            distinct_id: this.currentIdentifiedDistinctIdForPosthog,
            $set: this.accumulatedUserTraitsForIdentification,
          },
        ],
      };

      try {
        await fetch(this.posthogBatchApiEndpoint, {
          method: 'POST',
          body: JSON.stringify(finalIdentifyPayload),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch {
        // Suppress errors during shutdown
      }
    }

    this.hasConnectorBeenInitialized = false;
    this.isConnectorReadyToSendData = false;
    this.currentIdentifiedDistinctIdForPosthog = undefined;
    this.accumulatedUserTraitsForIdentification = {};

    console.log('[UserMesh] PostHog connector shut down');
  }

  /**
   * Get the platform name for this connector.
   */
  getPlatformName(): string {
    return 'posthog';
  }

  /**
   * Transform UserMesh events to PostHog Batch API format.
   *
   * Maps UserMesh's universal event structure to PostHog's expected format.
   */
  private transformUserMeshEventsToPosthogFormat(eventBatch: EventBatch): PostHogBatchApiRequest {
    return {
      api_key: this.postHogConfiguration.projectApiKey,
      batch: eventBatch.queuedAnalyticsEventRecords.map((userMeshEvent) => ({
        event: userMeshEvent.analyticsEventName,
        distinct_id: userMeshEvent.authenticatedUserId || this.currentIdentifiedDistinctIdForPosthog || 'anonymous',
        timestamp: new Date(userMeshEvent.eventTimestampMilliseconds).toISOString(),
        properties: {
          ...userMeshEvent.eventPropertiesData,
          $session_id: userMeshEvent.currentSessionIdentifier,
          $sdk_version: userMeshEvent.contextInformation?.softwareDevelopmentKitVersion,
          $platform: userMeshEvent.contextInformation?.applicationPlatform,
          $page_url: userMeshEvent.contextInformation?.pageOrScreenUrl,
        },
        library: {
          name: 'usermesh-sdk-web',
          version: userMeshEvent.contextInformation?.softwareDevelopmentKitVersion || '1.0.0',
        },
      })),
    };
  }
}
