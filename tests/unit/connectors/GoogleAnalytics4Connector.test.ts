/**
 * Unit Tests for Google Analytics 4 Connector
 *
 * Tests GA4 connector initialization, event transmission,
 * and proper error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleAnalytics4Connector } from '../../../src/connectors/GoogleAnalytics4Connector';
import type { EventBatch, UserIdentificationProfile } from '../../../src/types/UserMeshEventTypes';

describe('GoogleAnalytics4Connector', () => {
  let connector: GoogleAnalytics4Connector;

  beforeEach(() => {
    connector = new GoogleAnalytics4Connector({
      googlePropertyIdentifier: 'G-ABC123XYZ',
      measurementProtocolApiSecret: 'secret_12345',
    });
  });

  describe('constructor', () => {
    it('should create connector with valid property identifier', () => {
      const validConnector = new GoogleAnalytics4Connector({
        googlePropertyIdentifier: 'G-XXXXXXXXXX',
      });
      expect(validConnector).toBeDefined();
    });

    it('should throw error with invalid property identifier', () => {
      expect(
        () =>
          new GoogleAnalytics4Connector({
            googlePropertyIdentifier: 'INVALID_ID',
          })
      ).toThrow();
    });

    it('should throw error with missing property identifier', () => {
      expect(
        () =>
          new GoogleAnalytics4Connector({
            googlePropertyIdentifier: '',
          })
      ).toThrow();
    });
  });

  describe('initializeAnalyticsConnector', () => {
    it('should initialize without errors', async () => {
      // Mock fetch for connectivity test
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        text: async () => 'OK',
      });

      await expect(connector.initializeAnalyticsConnector()).resolves.toBeUndefined();
    });

    it('should handle initialization failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(connector.initializeAnalyticsConnector()).resolves.toBeUndefined();
    });
  });

  describe('getPlatformName', () => {
    it('should return correct platform name', () => {
      expect(connector.getPlatformName()).toBe('google_analytics_4');
    });
  });

  describe('transmitEventBatchToAnalyticsPlatform', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        text: async () => 'No Content',
      });
    });

    it('should return success for valid batch', async () => {
      const batch: EventBatch = {
        uniqueBatchIdentifier: 'batch_123',
        batchCreationTimestampMilliseconds: Date.now(),
        queuedAnalyticsEventRecords: [
          {
            uniqueEventIdentifier: 'event_1',
            eventTimestampMilliseconds: Date.now(),
            analyticsEventName: 'test_event',
            currentSessionIdentifier: 'session_123',
            eventPropertiesData: { testProp: 'testValue' },
            contextInformation: {
              applicationPlatform: 'web',
              softwareDevelopmentKitVersion: '1.0.0',
            },
          },
        ],
        sdkInstanceIdentifier: 'sdk_123',
        sdkVersionThatCreatedBatch: '1.0.0',
      };

      const result = await connector.transmitEventBatchToAnalyticsPlatform(batch);

      expect(result.wasOperationSuccessful).toBe(true);
      expect(result.platformSpecificMetadata?.eventCount).toBe(1);
    });

    it('should handle empty batch', async () => {
      const emptyBatch: EventBatch = {
        uniqueBatchIdentifier: 'batch_empty',
        batchCreationTimestampMilliseconds: Date.now(),
        queuedAnalyticsEventRecords: [],
        sdkInstanceIdentifier: 'sdk_123',
        sdkVersionThatCreatedBatch: '1.0.0',
      };

      const result = await connector.transmitEventBatchToAnalyticsPlatform(emptyBatch);

      expect(result.wasOperationSuccessful).toBe(true);
      expect(result.operationStatusMessage).toContain('Empty');
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 400,
        text: async () => 'Bad Request',
      });

      const batch: EventBatch = {
        uniqueBatchIdentifier: 'batch_123',
        batchCreationTimestampMilliseconds: Date.now(),
        queuedAnalyticsEventRecords: [
          {
            uniqueEventIdentifier: 'event_1',
            eventTimestampMilliseconds: Date.now(),
            analyticsEventName: 'test_event',
            currentSessionIdentifier: 'session_123',
            eventPropertiesData: {},
            contextInformation: {
              applicationPlatform: 'web',
              softwareDevelopmentKitVersion: '1.0.0',
            },
          },
        ],
        sdkInstanceIdentifier: 'sdk_123',
        sdkVersionThatCreatedBatch: '1.0.0',
      };

      const result = await connector.transmitEventBatchToAnalyticsPlatform(batch);

      expect(result.wasOperationSuccessful).toBe(false);
      expect(result.underlyingErrorIfAny).toBeDefined();
    });
  });

  describe('identifyUserOnAnalyticsPlatform', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        text: async () => 'No Content',
      });
    });

    it('should identify user successfully', async () => {
      const userProfile: UserIdentificationProfile = {
        primaryUserId: 'user_12345',
        userTraitsAndAttributes: {
          email: 'user@example.com',
          accountType: 'premium',
        },
        profileCreationTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
      };

      const result = await connector.identifyUserOnAnalyticsPlatform(userProfile);

      expect(result.wasOperationSuccessful).toBe(true);
      expect(result.platformSpecificMetadata?.userId).toBe('user_12345');
    });
  });

  describe('isConnectorCurrentlyReady', () => {
    it('should return true when endpoint is reachable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        text: async () => 'OK',
      });

      const isReady = await connector.isConnectorCurrentlyReady();

      expect(isReady).toBe(true);
    });

    it('should return false when endpoint is unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const isReady = await connector.isConnectorCurrentlyReady();

      expect(isReady).toBe(false);
    });
  });

  describe('shutdownAnalyticsConnector', () => {
    it('should shutdown without errors', async () => {
      await expect(connector.shutdownAnalyticsConnector()).resolves.toBeUndefined();
    });
  });
});
