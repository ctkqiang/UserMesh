/**
 * Unit Tests for UserMesh Analytics SDK Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserMeshAnalyticsSdkClient } from '../../../src/core/UserMeshAnalyticsSdkClient';
import type { UserMeshSdkConfiguration } from '../../../src/types/UserMeshConfigurationTypes';

describe('UserMeshAnalyticsSdkClient', () => {
  let sdkConfig: UserMeshSdkConfiguration;

  beforeEach(() => {
    sdkConfig = {
      analyticsIntegrations: {
        googleAnalytics4: {
          isEnabled: true,
          googlePropertyIdentifier: 'G-ABC123XYZ',
        },
      },
      sdkBehaviorConfiguration: {
        enableDetailedDebugLogging: false,
        operatingMode: 'development',
      },
    };
  });

  describe('constructor', () => {
    it('should create SDK instance with valid config', () => {
      const sdk = new UserMeshAnalyticsSdkClient(sdkConfig);
      expect(sdk).toBeDefined();
    });

    it('should throw error with invalid config', () => {
      expect(
        () =>
          new UserMeshAnalyticsSdkClient({
            analyticsIntegrations: {
              googleAnalytics4: {
                isEnabled: true,
                googlePropertyIdentifier: 'INVALID',
              },
            },
          } as any)
      ).toThrow();
    });
  });

  describe('initialization', () => {
    it('should initialize SDK successfully', async () => {
      const sdk = new UserMeshAnalyticsSdkClient(sdkConfig);

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        text: async () => 'OK',
      });

      await expect(sdk.initializeUserMeshAnalyticsSdk()).resolves.toBeUndefined();
    });

    it('should prevent double initialization', async () => {
      const sdk = new UserMeshAnalyticsSdkClient(sdkConfig);

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        text: async () => 'OK',
      });

      await sdk.initializeUserMeshAnalyticsSdk();
      await expect(sdk.initializeUserMeshAnalyticsSdk()).resolves.toBeUndefined();
    });
  });

  describe('event tracking', () => {
    it('should require initialization before tracking', async () => {
      const sdk = new UserMeshAnalyticsSdkClient(sdkConfig);

      await expect(
        sdk.recordAnalyticsEvent('test_event', { test: true })
      ).rejects.toThrow();
    });
  });
});
