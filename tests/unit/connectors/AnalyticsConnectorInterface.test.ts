/**
 * Unit Tests for Analytics Connector Interface
 *
 * These tests verify that the AnalyticsConnectorInterface
 * defines proper contract and all methods are callable.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  AnalyticsConnectorInterface,
  ConnectorOperationResult,
} from '../../../src/connectors/types/AnalyticsConnectorInterface';
import type { EventBatch, UserIdentificationProfile } from '../../../src/types/UserMeshEventTypes';

/**
 * Mock connector for testing the interface contract
 */
class MockAnalyticsConnector implements AnalyticsConnectorInterface {
  private isInitialized = false;
  private isReady = false;
  private currentUserId: string | undefined;

  async initializeAnalyticsConnector(): Promise<void> {
    this.isInitialized = true;
    this.isReady = true;
  }

  async transmitEventBatchToAnalyticsPlatform(
    eventBatch: EventBatch
  ): Promise<ConnectorOperationResult> {
    if (!this.isReady) {
      return {
        wasOperationSuccessful: false,
        operationStatusMessage: 'Connector not ready',
        operationCompletionTimestampMilliseconds: Date.now(),
        underlyingErrorIfAny: new Error('Not initialized'),
      };
    }

    return {
      wasOperationSuccessful: true,
      operationStatusMessage: `Sent ${eventBatch.queuedAnalyticsEventRecords.length} events`,
      operationCompletionTimestampMilliseconds: Date.now(),
      platformSpecificMetadata: {
        eventCount: eventBatch.queuedAnalyticsEventRecords.length,
      },
    };
  }

  async identifyUserOnAnalyticsPlatform(
    userProfile: UserIdentificationProfile
  ): Promise<ConnectorOperationResult> {
    this.currentUserId = userProfile.primaryUserId;

    return {
      wasOperationSuccessful: true,
      operationStatusMessage: `Identified user: ${userProfile.primaryUserId}`,
      operationCompletionTimestampMilliseconds: Date.now(),
      platformSpecificMetadata: {
        userId: userProfile.primaryUserId,
      },
    };
  }

  async trackPageViewEventOnAnalyticsPlatform(
    pageUrl: string,
    pageTitle?: string
  ): Promise<ConnectorOperationResult> {
    return {
      wasOperationSuccessful: true,
      operationStatusMessage: `Tracked page view: ${pageUrl}`,
      operationCompletionTimestampMilliseconds: Date.now(),
      platformSpecificMetadata: {
        pageUrl,
        pageTitle,
      },
    };
  }

  async isConnectorCurrentlyReady(): Promise<boolean> {
    return this.isReady;
  }

  async shutdownAnalyticsConnector(): Promise<void> {
    this.isInitialized = false;
    this.isReady = false;
    this.currentUserId = undefined;
  }

  getPlatformName(): string {
    return 'mock_platform';
  }
}

describe('AnalyticsConnectorInterface', () => {
  let mockConnector: MockAnalyticsConnector;

  beforeEach(() => {
    mockConnector = new MockAnalyticsConnector();
  });

  it('should initialize connector without errors', async () => {
    await expect(mockConnector.initializeAnalyticsConnector()).resolves.toBeUndefined();
  });

  it('should return platform name', () => {
    expect(mockConnector.getPlatformName()).toBe('mock_platform');
  });

  it('should check if connector is ready', async () => {
    const isReady = await mockConnector.isConnectorCurrentlyReady();
    expect(typeof isReady).toBe('boolean');
  });

  it('should transmit event batch successfully', async () => {
    await mockConnector.initializeAnalyticsConnector();

    const testBatch: EventBatch = {
      uniqueBatchIdentifier: 'batch_123',
      batchCreationTimestampMilliseconds: Date.now(),
      queuedAnalyticsEventRecords: [
        {
          uniqueEventIdentifier: 'event_1',
          eventTimestampMilliseconds: Date.now(),
          analyticsEventName: 'test_event',
          currentSessionIdentifier: 'session_123',
          eventPropertiesData: { test: true },
          contextInformation: {
            applicationPlatform: 'web',
            softwareDevelopmentKitVersion: '1.0.0',
          },
        },
      ],
      sdkInstanceIdentifier: 'sdk_123',
      sdkVersionThatCreatedBatch: '1.0.0',
    };

    const result = await mockConnector.transmitEventBatchToAnalyticsPlatform(testBatch);

    expect(result.wasOperationSuccessful).toBe(true);
    expect(result.operationStatusMessage).toContain('Sent');
    expect(result.operationCompletionTimestampMilliseconds).toBeGreaterThan(0);
  });

  it('should identify user on connector', async () => {
    const userProfile: UserIdentificationProfile = {
      primaryUserId: 'user_12345',
      userTraitsAndAttributes: {
        email: 'user@example.com',
        accountType: 'premium',
      },
      profileCreationTimestamp: Date.now(),
      lastActivityTimestamp: Date.now(),
    };

    const result = await mockConnector.identifyUserOnAnalyticsPlatform(userProfile);

    expect(result.wasOperationSuccessful).toBe(true);
    expect(result.platformSpecificMetadata?.userId).toBe('user_12345');
  });

  it('should track page view event', async () => {
    const result = await mockConnector.trackPageViewEventOnAnalyticsPlatform(
      'https://example.com/page',
      'Test Page'
    );

    expect(result.wasOperationSuccessful).toBe(true);
    expect(result.platformSpecificMetadata?.pageUrl).toBe('https://example.com/page');
  });

  it('should shutdown connector gracefully', async () => {
    await mockConnector.initializeAnalyticsConnector();
    await expect(mockConnector.shutdownAnalyticsConnector()).resolves.toBeUndefined();
  });

  it('should return proper ConnectorOperationResult structure', async () => {
    const result = await mockConnector.isConnectorCurrentlyReady();
    expect(typeof result).toBe('boolean');
  });

  it('should fail to transmit when not initialized', async () => {
    const testBatch: EventBatch = {
      uniqueBatchIdentifier: 'batch_123',
      batchCreationTimestampMilliseconds: Date.now(),
      queuedAnalyticsEventRecords: [],
      sdkInstanceIdentifier: 'sdk_123',
      sdkVersionThatCreatedBatch: '1.0.0',
    };

    const result = await mockConnector.transmitEventBatchToAnalyticsPlatform(testBatch);

    expect(result.wasOperationSuccessful).toBe(false);
    expect(result.underlyingErrorIfAny).toBeDefined();
  });
});
