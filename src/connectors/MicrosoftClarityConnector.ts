/**
 * Microsoft Clarity Connector
 *
 * Integrates UserMesh with Microsoft Clarity session analytics platform.
 * Clarity specializes in session recording, heatmaps, and form analytics
 * to understand real user behavior on your website.
 *
 * Why this connector: Clarity has a simpler API than other analytics platforms
 * but focuses on session behavior rather than discrete events. This connector
 * bridges that difference by translating UserMesh events into Clarity's format.
 *
 * How it works:
 * - Uses Clarity's JavaScript API for event tracking
 * - Captures session recordings automatically
 * - Tracks custom events and user identification
 * - Provides heatmaps and session replay functionality
 *
 * When to use: When you want session recording, heatmaps, and form analytics
 * to understand how users interact with your UI
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
 * Configuration specific to Microsoft Clarity integration.
 */
interface MicrosoftClarityConnectorConfiguration {
  /**
   * The Clarity project identifier.
   * Format: Usually an alphanumeric string like "1a2b3c4d5e"
   * Find this in Clarity: Settings > Project ID
   */
  projectIdentifier: string;

  /**
   * Optional: Custom Clarity script URL for self-hosted or custom deployments.
   * Default: "https://www.clarity.ms/tag/{projectId}"
   * Most users don't need this.
   */
  customScriptUrl?: string;

  /**
   * Optional: Whether to enable session recording.
   * Default: true
   * Session recording allows viewing actual user sessions, but increases data usage.
   */
  shouldEnableSessionRecording?: boolean;

  /**
   * Optional: Custom user ID property name on the window.clarity object.
   * Default: "setUserID"
   * Usually you don't need to change this.
   */
  customUserIdPropertyName?: string;
}

/**
 * Microsoft Clarity Connector Implementation
 */
export class MicrosoftClarityConnector implements AnalyticsConnectorInterface {
  /**
   * Clarity-specific configuration provided during initialization.
   */
  private clarityConfiguration: MicrosoftClarityConnectorConfiguration;

  /**
   * Whether the connector has been initialized.
   */
  private hasConnectorBeenInitialized: boolean = false;

  /**
   * Whether the connector is currently ready to send data.
   */
  private isConnectorReadyToSendData: boolean = false;

  /**
   * Reference to the global window.clarity object if available.
   * This is set during initialization when Clarity's SDK loads.
   */
  private clarityApiObject: any;

  /**
   * Current user's ID, if one has been identified.
   * Stored so we can set it on Clarity if it's not already set.
   */
  private currentIdentifiedUserIdForClarity: string | undefined;

  /**
   * Create a new Microsoft Clarity connector.
   *
   * @param clarityConfig - Configuration with Clarity project ID
   * @throws Error if configuration is invalid
   */
  constructor(clarityConfig: MicrosoftClarityConnectorConfiguration) {
    if (!clarityConfig.projectIdentifier) {
      throw new Error(
        'Clarity configuration error: projectIdentifier is required. ' +
          'Find this in Clarity: Settings > Project ID'
      );
    }

    this.clarityConfiguration = clarityConfig;
  }

  /**
   * Initialize the Microsoft Clarity connector.
   *
   * This loads the Clarity JavaScript SDK and waits for it to become available.
   * Clarity's SDK is loaded dynamically as a script tag.
   */
  async initializeAnalyticsConnector(): Promise<void> {
    if (this.hasConnectorBeenInitialized) {
      return;
    }

    try {
      // Check if running in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Clarity connector can only be used in browser environments');
      }

      // Construct the Clarity script URL
      const clarityScriptUrl =
        this.clarityConfiguration.customScriptUrl ||
        `https://www.clarity.ms/tag/${this.clarityConfiguration.projectIdentifier}`;

      // Check if Clarity is already loaded (may be loaded elsewhere in the app)
      if ((window as any).clarity) {
        this.clarityApiObject = (window as any).clarity;
        this.isConnectorReadyToSendData = true;
        this.hasConnectorBeenInitialized = true;
        console.log('[UserMesh] Clarity already loaded, connector initialized');
        return;
      }

      // Load Clarity SDK asynchronously
      const clarityScriptLoaded = await this.loadClarityScript(clarityScriptUrl);

      if (!clarityScriptLoaded) {
        throw new Error('Failed to load Clarity SDK script');
      }

      // Wait a moment for Clarity to initialize globally
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if Clarity became available after loading
      this.clarityApiObject = (window as any).clarity;

      if (!this.clarityApiObject) {
        throw new Error(
          'Clarity SDK loaded but window.clarity not available. ' +
            'Check that the project ID is correct.'
        );
      }

      this.isConnectorReadyToSendData = true;
      this.hasConnectorBeenInitialized = true;

      console.log('[UserMesh] Microsoft Clarity connector initialized successfully');
    } catch (initializationError) {
      this.hasConnectorBeenInitialized = true;
      this.isConnectorReadyToSendData = false;

      console.warn(
        '[UserMesh] Clarity connector initialization failed. ' +
          'Session recording and event tracking will not work.',
        initializationError
      );
    }
  }

  /**
   * Send a batch of events to Microsoft Clarity.
   *
   * Clarity doesn't have a batch API like other platforms. Instead, we send
   * each event individually through the Clarity window API.
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

    // Check if Clarity is ready
    if (!this.clarityApiObject || typeof this.clarityApiObject !== 'object') {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: 'Clarity API not available',
        underlyingErrorIfAny: new Error('Clarity connector not initialized'),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }

    try {
      // Send each event individually
      let successCount = 0;

      for (const userMeshEvent of eventBatch.queuedAnalyticsEventRecords) {
        try {
          // Clarity uses the event() method to track custom events
          if (typeof this.clarityApiObject.event === 'function') {
            this.clarityApiObject.event(
              userMeshEvent.analyticsEventName,
              userMeshEvent.eventPropertiesData
            );
            successCount++;
          }
        } catch (eventError) {
          console.warn(
            `[UserMesh] Failed to send event to Clarity: ${userMeshEvent.analyticsEventName}`,
            eventError
          );
        }
      }

      if (successCount === eventBatch.queuedAnalyticsEventRecords.length) {
        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `Successfully sent ${successCount} events to Clarity`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            eventCount: successCount,
          },
        };
      } else {
        return {
          wasOperationSuccessful: false,
          operationStatusMessage: `Sent ${successCount}/${eventBatch.queuedAnalyticsEventRecords.length} events to Clarity`,
          underlyingErrorIfAny: new Error(
            `Only ${successCount}/${eventBatch.queuedAnalyticsEventRecords.length} events were sent`
          ),
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            successCount,
            totalCount: eventBatch.queuedAnalyticsEventRecords.length,
          },
        };
      }
    } catch (transmissionError) {
      this.isConnectorReadyToSendData = false;

      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to send events to Clarity: ${String(transmissionError)}`,
        underlyingErrorIfAny:
          transmissionError instanceof Error
            ? transmissionError
            : new Error(String(transmissionError)),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }
  }

  /**
   * Identify a user on Microsoft Clarity.
   *
   * Clarity calls this "setUserID" and it associates the session with a specific user.
   * This allows you to identify sessions with user data in Clarity's dashboard.
   */
  async identifyUserOnAnalyticsPlatform(
    userProfile: UserIdentificationProfile
  ): Promise<ConnectorOperationResult> {
    if (!this.clarityApiObject || typeof this.clarityApiObject !== 'object') {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: 'Clarity API not available',
        underlyingErrorIfAny: new Error('Clarity connector not initialized'),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }

    try {
      // Store the user ID
      this.currentIdentifiedUserIdForClarity = userProfile.primaryUserId;

      // Use Clarity's setUserID method to identify the user
      const setUserIdMethod = this.clarityConfiguration.customUserIdPropertyName || 'setUserID';

      if (typeof this.clarityApiObject[setUserIdMethod] === 'function') {
        this.clarityApiObject[setUserIdMethod](userProfile.primaryUserId);

        // Optionally, send user traits as a custom event
        if (Object.keys(userProfile.userTraitsAndAttributes).length > 0) {
          if (typeof this.clarityApiObject.event === 'function') {
            this.clarityApiObject.event('user_identified', {
              user_id: userProfile.primaryUserId,
              traits: userProfile.userTraitsAndAttributes,
            });
          }
        }

        return {
          wasOperationSuccessful: true,
          operationStatusMessage: `User identified on Clarity with ${Object.keys(userProfile.userTraitsAndAttributes).length} properties`,
          operationCompletionTimestampMilliseconds: Date.now(),
          platformSpecificMetadata: {
            userId: userProfile.primaryUserId,
            propertyCount: Object.keys(userProfile.userTraitsAndAttributes).length,
          },
        };
      } else {
        throw new Error(`Clarity method "${setUserIdMethod}" is not available`);
      }
    } catch (identifyError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to identify user on Clarity: ${String(identifyError)}`,
        underlyingErrorIfAny:
          identifyError instanceof Error
            ? identifyError
            : new Error(String(identifyError)),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }
  }

  /**
   * Track a page view event on Microsoft Clarity.
   *
   * Clarity automatically tracks page views via its SDK.
   * We can enhance this by sending an explicit event.
   */
  async trackPageViewEventOnAnalyticsPlatform(
    pageUrl: string,
    pageTitle?: string,
    additionalPageProperties?: Record<string, unknown>
  ): Promise<ConnectorOperationResult> {
    if (!this.clarityApiObject || typeof this.clarityApiObject !== 'object') {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: 'Clarity API not available',
        underlyingErrorIfAny: new Error('Clarity connector not initialized'),
        operationCompletionTimestampMilliseconds: Date.now(),
      };
    }

    try {
      // Clarity automatically tracks page views, but we can send a custom event
      if (typeof this.clarityApiObject.event === 'function') {
        this.clarityApiObject.event('page_view', {
          page_url: pageUrl,
          page_title: pageTitle || '',
          ...additionalPageProperties,
        });
      }

      return {
        wasOperationSuccessful: true,
        operationStatusMessage: `Page view tracked on Clarity: ${pageUrl}`,
        operationCompletionTimestampMilliseconds: Date.now(),
        platformSpecificMetadata: {
          pageUrl,
          pageTitle,
        },
      };
    } catch (pageViewError) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: `Failed to track page view on Clarity: ${String(pageViewError)}`,
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
   * For Clarity, this checks if the Clarity API object is available.
   */
  async isConnectorCurrentlyReady(): Promise<boolean> {
    // Check if window.clarity is available
    if (typeof window !== 'undefined' && (window as any).clarity) {
      this.clarityApiObject = (window as any).clarity;
      this.isConnectorReadyToSendData = true;
      return true;
    }

    this.isConnectorReadyToSendData = false;
    return false;
  }

  /**
   * Shut down the Microsoft Clarity connector.
   *
   * For Clarity, there's nothing to shut down since Clarity's SDK
   * handles its own lifecycle. We just clean up our state.
   */
  async shutdownAnalyticsConnector(): Promise<void> {
    // Note: We don't unload Clarity's script because it may be used
    // elsewhere in the application. We just clean up our reference.
    this.hasConnectorBeenInitialized = false;
    this.isConnectorReadyToSendData = false;
    this.clarityApiObject = undefined;
    this.currentIdentifiedUserIdForClarity = undefined;

    console.log('[UserMesh] Microsoft Clarity connector shut down');
  }

  /**
   * Get the platform name for this connector.
   */
  getPlatformName(): string {
    return 'clarity';
  }

  /**
   * Load the Clarity JavaScript SDK dynamically.
   *
   * Injects a script tag into the DOM to load Clarity from their CDN.
   * Returns a promise that resolves when the script is loaded.
   *
   * @param clarityScriptUrl - URL to the Clarity script
   * @returns Promise that resolves to true if script loaded successfully
   */
  private loadClarityScript(clarityScriptUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const scriptElement = document.createElement('script');
        scriptElement.src = clarityScriptUrl;
        scriptElement.async = true;

        scriptElement.onload = () => {
          resolve(true);
        };

        scriptElement.onerror = () => {
          resolve(false);
        };

        // Add a timeout in case the script never loads or fails silently
        setTimeout(() => {
          resolve((window as any).clarity !== undefined);
        }, 5000);

        document.head.appendChild(scriptElement);
      } catch {
        resolve(false);
      }
    });
  }
}
