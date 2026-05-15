/**
 * UserMesh Analytics SDK - Main Export
 *
 * This is the main entry point for the @usermesh/sdk-web package.
 * Import all public APIs that developers will use from here.
 *
 * Usage:
 * ```typescript
 * import {
 *   UserMeshAnalyticsSdkClient,
 *   useUserMeshEventQueueStore,
 * } from '@usermesh/sdk-web';
 * ```
 */

// Core SDK client
export { UserMeshAnalyticsSdkClient } from './core/UserMeshAnalyticsSdkClient';
export { UserMeshConfigurationValidator } from './core/UserMeshConfigurationValidator';

// Type definitions
export type {
  UserMeshSdkConfiguration,
  GoogleAnalytics4IntegrationConfiguration,
  PostHogAnalyticsIntegrationConfiguration,
  MixpanelAnalyticsIntegrationConfiguration,
  MicrosoftClarityIntegrationConfiguration,
  CustomAnalyticsEndpointConfiguration,
  SdkRuntimeBehaviorConfiguration,
  DataSecurityAndPrivacyConfiguration,
} from './types/UserMeshConfigurationTypes';

export type {
  AnalyticsEventRecord,
  EventContextInformation,
  DeviceInformationData,
  PlatformRoutingInstruction,
  UserIdentificationProfile,
  EventValidationResult,
  EventBatch,
  BatchDeliveryResult,
  PageOrScreenTrackingConfiguration,
} from './types/UserMeshEventTypes';

export type {
  StoredAnalyticsEvent,
  OfflineEventQueueMetadata,
  StorageOperationResult,
  StorageBackendInterface,
  OfflineStorageConfiguration,
} from './types/UserMeshStorageTypes';

// State management (Zustand hooks)
export { useUserMeshEventQueueStore } from './state/UserMeshEventQueueStore';
export type { UserMeshEventQueueStoreState, QueuedEventWithMetadata } from './state/UserMeshEventQueueStore';

export { useUserMeshUserProfileStore } from './state/UserMeshUserProfileStore';
export type { UserMeshUserProfileStoreState } from './state/UserMeshUserProfileStore';

// Encryption service
export { UserMeshDataEncryptionService } from './encryption/UserMeshDataEncryptionService';
export type {
  EncryptionOperationResult,
  DecryptionOperationResult,
} from './encryption/UserMeshDataEncryptionService';

// Validation
export { UserMeshEventValidator } from './validation/UserMeshEventValidationEngine';
export type { EventValidationRule } from './validation/UserMeshEventValidationEngine';

// Storage implementations
export { UserMeshOfflineEventQueueStorage } from './storage/UserMeshOfflineEventQueueStorage';
export { UserMeshLocalStorageAdapter } from './storage/UserMeshLocalStorageAdapter';

// Utilities
export { UserMeshIdentifierGenerator } from './utils/UserMeshIdentifierGenerator';

// Connectors (analytics platform integrations)
export { GoogleAnalytics4Connector } from './connectors/GoogleAnalytics4Connector';
export { PostHogAnalyticsConnector } from './connectors/PostHogAnalyticsConnector';
export { MixpanelAnalyticsConnector } from './connectors/MixpanelAnalyticsConnector';
export { MicrosoftClarityConnector } from './connectors/MicrosoftClarityConnector';
export { CustomEndpointConnector } from './connectors/CustomEndpointConnector';

export type {
  AnalyticsConnectorInterface,
  ConnectorOperationResult,
} from './connectors/types/AnalyticsConnectorInterface';

// Configuration validators
export type { ConfigurationValidationResult } from './core/UserMeshConfigurationValidator';
