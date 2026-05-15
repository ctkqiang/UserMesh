/**
 * Custom Endpoint Connector
 *
 * Allows UserMesh to send events to any custom HTTP endpoint.
 * This enables integration with custom analytics backends, in-house solutions,
 * or any analytics platform that UserMesh doesn't have a native connector for.
 *
 * Why this connector exists: Not every application uses GA4, PostHog, Mixpanel,
 * or Clarity. Some teams have their own analytics infrastructure. This connector
 * lets UserMesh send events to any HTTP endpoint, making it universally compatible.
 *
 * How it works:
 * - Accepts a custom HTTP endpoint URL
 * - Optionally signs requests with an API key for authentication
 * - Sends batches of UserMesh events as JSON POST requests
 * - Supports custom request headers and authentication methods
 *
 * When to use: When you have a custom analytics backend or want to send
 * events to a platform that UserMesh doesn't have a native connector for
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
 * Configuration for the custom HTTP endpoint connector.
 */
interface CustomEndpointConnectorConfiguration {
  /**
   * The HTTP endpoint URL where events should be sent.
   * Examples:
   * - "https://analytics.yourcompany.com/api/v1/events"
   * - "http://localhost:8000/events"
   * - "https://your-backend.cloud.service/ingest"
   *
   * The endpoint should accept POST requests with a JSON body.
   */
  endpointUrl: string;

  /**
   * Optional: API key for authentication.
   * How it's used depends on the customAuthenticationMethod.
   * If customAuthenticationMethod is "apiKey", this is sent as a header.
   * If customAuthenticationMethod is "bearer", this is sent as a Bearer token.
   */
  apiKeyOrToken?: string;

  /**
   * Optional: How to authenticate requests to the custom endpoint.
   * Options:
   * - "none": No authentication (public endpoint)
   * - "apiKey": Send apiKeyOrToken as "X-API-Key" header
   * - "bearer": Send apiKeyOrToken as "Authorization: Bearer {token}"
   * - "custom": Use customAuthenticationHeader for custom header format
   *
   * Default: "none"
   */
  customAuthenticationMethod?: 'none' | 'apiKey' | 'bearer' | 'custom';

  /**
   * Optional: For customAuthenticationMethod="custom", specify the header
   * to send the API key with.
   * Example: {"Authorization": "Custom {token}"}
   * The string "{token}" will be replaced with apiKeyOrToken.
   */
  customAuthenticationHeader?: {
    headerName: string;
    headerValueTemplate: string; // e.g., "Custom {token}", "Bearer {token}"
  };

  /**
   * Optional: Additional HTTP headers to send with every request.
   * Examples: {"X-Custom-Header": "value"}
   * UserMesh automatically sets "Content-Type: application/json".
   */
  additionalHttpHeaders?: Record<string, string>;

  /**
   * Optional: Whether to include user identification in the batch payload.
   * If true, user profile is included in the batch.
   * If false, only events are sent (user context is in each event).
   *
   * Default: true
   */
  shouldIncludeUserProfileInBatch?: boolean;

  /**
   * Optional: Timeout for requests to the endpoint (milliseconds).
   * Default: 30000 (30 seconds)
   */
  requestTimeoutMilliseconds?: number;

  /**
   * Optional: Whether to retry failed requests.
   * If true, failed requests will be queued for retry.
   * If false, failed requests are dropped.
   *
   * Default: true
   */
  shouldRetryFailedRequests?: boolean;

  /**
   * Optional: Maximum number of retries for failed requests.
   * Only used if shouldRetryFailedRequests is true.
   * Default: 3
   */
  maximumRetryAttempts?: number;
}

/**
 * Standard batch payload format sent to the custom endpoint.
 * This structure allows custom endpoints to understand UserMesh events.
 */
interface CustomEndpointBatchPayload {
  /**
   * Metadata about this batch.
   */
  batchMetadata: {
    /**
     * Batch ID (UUID) for tracking and deduplication.
     */
    batchIdentifier: string;

    /**
     * When this batch was created (Unix timestamp in milliseconds).
     */
    batchCreationTimestampMilliseconds: number;

    /**
     * Number of events in this batch.
     */
    eventCount: number;

    /**
     * Identifier of the UserMesh SDK instance that created this batch.
     */
    sdkInstanceIdentifier?: string;

    /**
     * Version of UserMesh SDK that created this batch.
     */
    sdkVersion?: string;
  };

  /**
   * The user profile (if includeUserProfile was true in config).
   * Optional, included only if the custom endpoint requested it.
   */
  userProfile?: UserIdentificationProfile;

  /**
   * Array of events in this batch.
   */
  events: AnalyticsEventRecord[];
}

/**
 * Custom HTTP Endpoint Connector Implementation
 */
export class CustomEndpointConnector implements AnalyticsConnectorInterface {
  /**
   * Custom endpoint configuration provided during initialization.
   */
  private customEndpointConfiguration: CustomEndpointConnectorConfiguration;

  /**
   * Whether the connector has been initialized.
   */
  private hasConnectorBeenInitialized: boolean = false;

  /**
   * Whether the connector is currently ready to send data.
   */
  private isConnectorReadyToSendData: boolean = false;

  /**
   * Current user's profile, if one has been identified.
   * Included in batches if configuration requests it.
   */
  private currentUserProfileForCustomEndpoint: UserIdentificationProfile | undefined;

  /**
   * Queue of failed events to retry.
   * Used when shouldRetryFailedRequests is true.
   */
  private failedEventQueueForRetry: Array<{
    batch: EventBatch;
    retryAttempts: number;
  }> = [];

  /**
   * Create a new custom endpoint connector.
   *
   * @param customConfig - Configuration with endpoint URL and authentication details
   * @throws Error if configuration is invalid
   */
  constructor(customConfig: CustomEndpointConnectorConfiguration) {
    if (!customConfig.endpointUrl) {
      throw new Error(
        'Custom endpoint connector configuration error: endpointUrl is required. ' +
          'Provide the HTTP endpoint where events should be sent.'
      );
    }

    // Validate endpoint URL format
    try {
      new URL(customConfig.endpointUrl);
    } catch {
      throw new Error(
        `Custom endpoint connector configuration error: Invalid endpointUrl "${customConfig.endpointUrl}". ` +
          'Must be a valid HTTP or HTTPS URL.'
      );
    }

    this.customEndpointConfiguration = customConfig;
  }

  /**
   * Initialize the custom endpoint connector.
   *
   * Tests connectivity to the custom endpoint.
   */
  async initializeAnalyticsConnector(): Promise<void> {
    if (this.hasConnectorBeenInitialized) {
      return;
    }

    try {
      // Test connectivity by sending a minimal health check request
      const testPayload = {
        batchMetadata: {
          batchIdentifier: 'usermesh_init_test',
          batchCreationTimestampMilliseconds: Date.now(),
          eventCount: 0,
        },
        events: [],
      };

      const testResponse = await this.sendPayloadToCustomEndpoint(testPayload);

      if (testResponse.success) {
        this.isConnectorReadyToSendData = true;
      } else {
        this.isConnectorReadyToSendData = false;
      }

      this.hasConnectorBeenInitialized = true;
      console.log(
        '[UserMesh] Custom endpoint connector initialized for:',
        this.customEndpointConfiguration.endpointUrl
      );
    } catch (initializationError) {
      // Endpoint may be offline initially, but we'll retry when sending events
      this.hasConnectorBeenInitialized = true;
      this.isConnectorReadyToSendData = false;

      console.warn(
        '[UserMesh] Custom endpoint connector initialized but connectivity test failed. ' +
          'Will retry when sending events.',
        initializationError
      );
    }
  }

  /**
   * Send a batch of events to the custom endpoint.
   *
   * Transforms UserMesh events into the standard batch payload format
   * and sends them to the configured HTTP endpoint.
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
      // Construct the batch payload in standard format
      const customEndpointPayload: CustomEndpointBatchPayload = {
        batchMetadata: {
          batchIdentifier: eventBatch.uniqueBatchIdentifier,
          batchCreationTimestampMilliseconds: eventBatch.batchCreationTimestampMilliseconds,
          eventCount: eventBatch.queuedAnalyticsEventRecords.length,
          sdkInstanceIdentifier: eventBatch.sdkInstanceIdentifier,
          sdkVersion: eventBatch.sdkVersionThatCreatedBatch,
        },
        userProfile: this.customEndpointConfiguration.shouldIncludeUserProfileInBatch
          ? this.currentUserProfileForCustomEndpoint
          : undefined,
        events: eventBatch.queuedAnalyticsEventRecords,
      };

      // Send to the custom endpoint
      const sendResult = await this.sendPayloadToCustomEndpoint(customEndpointPayload);

      if (sendResult.success) {
        this.isConnectorReadyToSendData = true;

        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `Successfully sent ${eventBatch.queuedAnalyticsEventRecords.length} events to custom endpoint`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            endpointUrl: this.customEndpointConfiguration.endpointUrl,
            eventCount: eventBatch.queuedAnalyticsEventRecords.length,
            statusCode: sendResult.statusCode,
            responseTime: sendResult.responseTimeMilliseconds,
          },
        };
      } else {
        // Check if we should retry this batch
        if (
          this.customEndpointConfiguration.shouldRetryFailedRequests &&
          this.failedEventQueueForRetry.length <
            (this.customEndpointConfiguration.maximumRetryAttempts || 3)
        ) {
          this.failedEventQueueForRetry.push({
            batch: eventBatch,
            retryAttempts: 0,
          });
        }

        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `Failed to send events to custom endpoint: ${sendResult.errorMessage}`,
          underlyingErrorIfAny: sendResult.error,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            endpointUrl: this.customEndpointConfiguration.endpointUrl,
            statusCode: sendResult.statusCode,
          },
        };
      }
    } catch (transmissionError) {
      this.isConnectorReadyToSendData = false;

      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to send events to custom endpoint: ${String(transmissionError)}`,
        underlyingErrorIfAny:
          transmissionError instanceof Error
            ? transmissionError
            : new Error(String(transmissionError)),
        operationCompletionTimestampMilliseconds: Date.now(),
        platformSpecificMetadata: {
          endpointUrl: this.customEndpointConfiguration.endpointUrl,
        },
      };
    }
  }

  /**
   * Identify a user on the custom endpoint.
   *
   * Stores the user profile and optionally sends an identification event
   * to the custom endpoint.
   */
  async identifyUserOnAnalyticsPlatform(
    userProfile: UserIdentificationProfile
  ): Promise<ConnectorOperationResult> {
    try {
      // Store the user profile for inclusion in future batches
      this.currentUserProfileForCustomEndpoint = userProfile;

      // Optionally send an identify event
      const identifyPayload: CustomEndpointBatchPayload = {
        batchMetadata: {
          batchIdentifier: `identify_${Date.now()}`,
          batchCreationTimestampMilliseconds: Date.now(),
          eventCount: 0,
        },
        userProfile: userProfile,
        events: [],
      };

      const sendResult = await this.sendPayloadToCustomEndpoint(identifyPayload);

      if (sendResult.success) {
        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `User identified on custom endpoint with ${Object.keys(userProfile.userTraitsAndAttributes).length} properties`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            userId: userProfile.primaryUserId,
            propertyCount: Object.keys(userProfile.userTraitsAndAttributes).length,
          },
        };
      } else {
        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `Failed to identify user: ${sendResult.errorMessage}`,
          underlyingErrorIfAny: sendResult.error,
          operationCompletionTimestampMilliseconds: Date.now(),
        };
      }
    } catch (identifyError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to identify user: ${String(identifyError)}`,
        underlyingErrorIfAny:
          identifyError instanceof Error
            ? identifyError
            : new Error(String(identifyError)),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }
  }

  /**
   * Track a page view event on the custom endpoint.
   *
   * Creates a page_view event and sends it to the endpoint.
   */
  async trackPageViewEventOnAnalyticsPlatform(
    pageUrl: string,
    pageTitle?: string,
    additionalPageProperties?: Record<string, unknown>
  ): Promise<ConnectorOperationResult> {
    try {
      // Create a page_view event
      const pageViewEvent: AnalyticsEventRecord = {
        uniqueEventIdentifier: `pv_${Date.now()}`,
        eventTimestampMilliseconds: Date.now(),
        analyticsEventName: 'page_view',
        currentSessionIdentifier: 'unknown',
        eventPropertiesData: {
          page_url: pageUrl,
          page_title: pageTitle || '',
          ...additionalPageProperties,
        },
        contextInformation: {
          applicationPlatform: 'web',
          softwareDevelopmentKitVersion: '1.0.0',
        },
      };

      const pageViewPayload: CustomEndpointBatchPayload = {
        batchMetadata: {
          batchIdentifier: `pv_batch_${Date.now()}`,
          batchCreationTimestampMilliseconds: Date.now(),
          eventCount: 1,
        },
        userProfile: this.currentUserProfileForCustomEndpoint,
        events: [pageViewEvent],
      };

      const sendResult = await this.sendPayloadToCustomEndpoint(pageViewPayload);

      if (sendResult.success) {
        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `Page view tracked on custom endpoint: ${pageUrl}`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            pageUrl,
            pageTitle,
          },
        };
      } else {
        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `Failed to track page view: ${sendResult.errorMessage}`,
          underlyingErrorIfAny: sendResult.error,
          operationCompletionTimestampMilliseconds: Date.now(),
        };
      }
    } catch (pageViewError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to track page view: ${String(pageViewError)}`,
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
   * Tests connectivity to the custom endpoint.
   */
  async isConnectorCurrentlyReady(): Promise<boolean> {
    try {
      const healthCheckPayload = {
        batchMetadata: {
          batchIdentifier: 'health_check',
          batchCreationTimestampMilliseconds: Date.now(),
          eventCount: 0,
        },
        events: [],
      };

      const result = await this.sendPayloadToCustomEndpoint(healthCheckPayload);
      this.isConnectorReadyToSendData = result.success;
      return result.success;
    } catch {
      this.isConnectorReadyToSendData = false;
      return false;
    }
  }

  /**
   * Shut down the custom endpoint connector.
   *
   * Sends any remaining failed events one more time before shutting down.
   */
  async shutdownAnalyticsConnector(): Promise<void> {
    // Attempt to send any remaining queued events
    if (this.failedEventQueueForRetry.length > 0) {
      console.log(
        `[UserMesh] Flushing ${this.failedEventQueueForRetry.length} failed events to custom endpoint during shutdown`
      );

      for (const failedItem of this.failedEventQueueForRetry) {
        try {
          await this.transmitEventBatchToAnalyticsPlatform(failedItem.batch);
        } catch {
          // Suppress errors during shutdown
        }
      }
    }

    this.hasConnectorBeenInitialized = false;
    this.isConnectorReadyToSendData = false;
    this.currentUserProfileForCustomEndpoint = undefined;
    this.failedEventQueueForRetry = [];

    console.log('[UserMesh] Custom endpoint connector shut down');
  }

  /**
   * Get the platform name for this connector.
   */
  getPlatformName(): string {
    return 'custom_endpoint';
  }

  /**
   * Send a payload to the custom endpoint.
   *
   * Internal helper method that handles the actual HTTP request,
   * authentication headers, and timeout management.
   */
  private async sendPayloadToCustomEndpoint(
    payload: CustomEndpointBatchPayload
  ): Promise<{
    success: boolean;
    statusCode?: number;
    errorMessage?: string;
    error?: Error;
    responseTimeMilliseconds?: number;
  }> {
    const requestStartTime = Date.now();

    try {
      // Build request headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.customEndpointConfiguration.additionalHttpHeaders,
      };

      // Add authentication header if configured
      if (this.customEndpointConfiguration.customAuthenticationMethod === 'apiKey') {
        if (this.customEndpointConfiguration.apiKeyOrToken) {
          requestHeaders['X-API-Key'] = this.customEndpointConfiguration.apiKeyOrToken;
        }
      } else if (this.customEndpointConfiguration.customAuthenticationMethod === 'bearer') {
        if (this.customEndpointConfiguration.apiKeyOrToken) {
          requestHeaders['Authorization'] = `Bearer ${this.customEndpointConfiguration.apiKeyOrToken}`;
        }
      } else if (this.customEndpointConfiguration.customAuthenticationMethod === 'custom') {
        if (
          this.customEndpointConfiguration.customAuthenticationHeader &&
          this.customEndpointConfiguration.apiKeyOrToken
        ) {
          const headerName = this.customEndpointConfiguration.customAuthenticationHeader.headerName;
          const headerValueTemplate =
            this.customEndpointConfiguration.customAuthenticationHeader.headerValueTemplate;
          const headerValue = headerValueTemplate.replace(
            '{token}',
            this.customEndpointConfiguration.apiKeyOrToken
          );
          requestHeaders[headerName] = headerValue;
        }
      }

      // Create an AbortController for timeout handling
      const timeoutDuration =
        this.customEndpointConfiguration.requestTimeoutMilliseconds || 30000;
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeoutDuration);

      try {
        // Send the request
        const response = await fetch(this.customEndpointConfiguration.endpointUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        // Check if the response was successful (2xx status code)
        if (response.status >= 200 && response.status < 300) {
          return {
            success: true,
            statusCode: response.status,
            responseTimeMilliseconds: Date.now() - requestStartTime,
          };
        } else {
          // Non-2xx response
          const responseText = await response.text();

          return {
            success: false,
            statusCode: response.status,
            errorMessage: `HTTP ${response.status}: ${responseText}`,
            error: new Error(`Custom endpoint returned ${response.status}: ${responseText}`),
            responseTimeMilliseconds: Date.now() - requestStartTime,
          };
        }
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          return {
            success: false,
            errorMessage: `Request timeout after ${timeoutDuration}ms`,
            error: new Error(`Request to custom endpoint timed out`),
            responseTimeMilliseconds: Date.now() - requestStartTime,
          };
        }

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: String(error),
        error: error instanceof Error ? error : new Error(String(error)),
        responseTimeMilliseconds: Date.now() - requestStartTime,
      };
    }
  }
}
