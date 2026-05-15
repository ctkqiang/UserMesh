/**
 * UserMesh Configuration Validator
 *
 * Validates the SDK configuration object to ensure all required fields
 * are present, have correct data types, and contain valid values.
 *
 * Why: Configuration validation prevents initialization failures and
 * ensures the SDK has all necessary credentials before attempting to use them.
 *
 * When: Called during UserMeshAnalyticsSdkClient initialization,
 * before any analytics operations begin.
 */

import type { UserMeshSdkConfiguration } from '../types/UserMeshConfigurationTypes';

/**
 * Result of configuration validation.
 */
export interface ConfigurationValidationResult {
  /**
   * Whether the configuration is valid and complete.
   */
  isConfigurationValid: boolean;

  /**
   * List of validation errors found (empty if valid).
   * Each error describes what's wrong and how to fix it.
   */
  validationErrorMessages: string[];

  /**
   * List of validation warnings (non-critical issues).
   * Configuration may still work but with degraded functionality.
   */
  validationWarningMessages: string[];

  /**
   * The validated configuration object (if valid).
   * May have been normalized or enriched with defaults.
   */
  validatedConfigurationObject?: UserMeshSdkConfiguration;
}

/**
 * UserMesh Configuration Validator
 *
 * Validates SDK configuration objects and reports errors and warnings.
 *
 * Usage:
 * ```typescript
 * const configValidator = new UserMeshConfigurationValidator();
 * const validationResult = configValidator.validateUserMeshSdkConfiguration(config);
 *
 * if (!validationResult.isConfigurationValid) {
 *   console.error('Configuration errors:', validationResult.validationErrorMessages);
 * }
 * ```
 */
export class UserMeshConfigurationValidator {
  /**
   * Validate a complete SDK configuration object.
   *
   * Checks for:
   * - Required fields are present
   * - Required fields are non-empty
   * - Data types are correct
   * - Values are reasonable
   * - At least one analytics platform is enabled
   *
   * Why: Ensures configuration is valid before SDK initialization.
   * When: Called during new UserMeshAnalyticsSdkClient() construction.
   *
   * @param configurationToValidate The configuration object to validate
   * @returns Validation result with errors and warnings
   */
  validateUserMeshSdkConfiguration(
    configurationToValidate: UserMeshSdkConfiguration
  ): ConfigurationValidationResult {
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Check that configuration object itself is valid
    if (!configurationToValidate || typeof configurationToValidate !== 'object') {
      return {
        isConfigurationValid: false,
        validationErrorMessages: ['Configuration must be a valid object'],
        validationWarningMessages: [],
      };
    }

    // Validate analytics integrations
    this.validateAnalyticsIntegrations(configurationToValidate, validationErrors, validationWarnings);

    // Validate SDK behavior configuration
    this.validateSdkBehaviorConfiguration(configurationToValidate, validationErrors, validationWarnings);

    // Validate security and privacy configuration
    this.validateSecurityAndPrivacyConfiguration(
      configurationToValidate,
      validationErrors,
      validationWarnings
    );

    // Check that at least one analytics platform is enabled
    const isAtLeastOnePlatformEnabled = this.isAtLeastOneAnalyticsPlatformEnabled(
      configurationToValidate
    );
    if (!isAtLeastOnePlatformEnabled) {
      validationErrors.push(
        'At least one analytics platform must be enabled in analyticsIntegrations configuration'
      );
    }

    const isConfigurationValid = validationErrors.length === 0;

    return {
      isConfigurationValid,
      validationErrorMessages: validationErrors,
      validationWarningMessages: validationWarnings,
      validatedConfigurationObject: isConfigurationValid ? configurationToValidate : undefined,
    };
  }

  /**
   * Validate analytics integrations configuration.
   *
   * Checks that any enabled platforms have required credentials.
   *
   * @param configuration The SDK configuration
   * @param validationErrors Array to append errors to
   * @param validationWarnings Array to append warnings to
   */
  private validateAnalyticsIntegrations(
    configuration: UserMeshSdkConfiguration,
    validationErrors: string[],
    validationWarnings: string[]
  ): void {
    if (!configuration.analyticsIntegrations) {
      validationErrors.push('analyticsIntegrations configuration is required');
      return;
    }

    const integrations = configuration.analyticsIntegrations;

    // Validate Google Analytics 4
    if (integrations.googleAnalytics4?.isEnabled) {
      if (!integrations.googleAnalytics4.googlePropertyIdentifier) {
        validationErrors.push(
          'Google Analytics 4 is enabled but googlePropertyIdentifier is missing. ' +
            'Get it from your GA4 property settings (e.g., "G-ABC123XYZ")'
        );
      }
    }

    // Validate PostHog
    if (integrations.postHogPlatform?.isEnabled) {
      if (!integrations.postHogPlatform.projectApiKey) {
        validationErrors.push(
          'PostHog is enabled but projectApiKey is missing. ' +
            'Get it from your PostHog project settings'
        );
      }
    }

    // Validate Mixpanel
    if (integrations.mixpanelPlatform?.isEnabled) {
      if (!integrations.mixpanelPlatform.projectToken) {
        validationErrors.push(
          'Mixpanel is enabled but projectToken is missing. ' +
            'Get it from your Mixpanel project settings'
        );
      }
    }

    // Validate Microsoft Clarity
    if (integrations.microsoftClarity?.isEnabled) {
      if (!integrations.microsoftClarity.projectIdentifier) {
        validationErrors.push(
          'Microsoft Clarity is enabled but projectIdentifier is missing. ' +
            'Get it from your Clarity project settings'
        );
      }
    }

    // Validate custom endpoints
    if (integrations.customAnalyticsEndpoint?.isEnabled) {
      if (!integrations.customAnalyticsEndpoint.endpointUrl) {
        validationErrors.push(
          'Custom analytics endpoint is enabled but endpointUrl is missing'
        );
      }

      if (!integrations.customAnalyticsEndpoint.endpointUrl.startsWith('http')) {
        validationErrors.push(
          'Custom analytics endpoint URL must start with http:// or https://'
        );
      }
    }
  }

  /**
   * Validate SDK behavior configuration.
   *
   * Checks queue sizing, flush intervals, and mode settings.
   *
   * @param configuration The SDK configuration
   * @param validationErrors Array to append errors to
   * @param validationWarnings Array to append warnings to
   */
  private validateSdkBehaviorConfiguration(
    configuration: UserMeshSdkConfiguration,
    validationErrors: string[],
    validationWarnings: string[]
  ): void {
    const behavior = configuration.sdkBehaviorConfiguration;

    if (!behavior) {
      validationWarnings.push(
        'sdkBehaviorConfiguration not specified, using defaults. ' +
          'This is fine for most applications.'
      );
      return;
    }

    // Validate queue size
    if (behavior.maximumQueuedEventsBeforeFlushing !== undefined) {
      if (behavior.maximumQueuedEventsBeforeFlushing < 1) {
        validationErrors.push(
          'maximumQueuedEventsBeforeFlushing must be at least 1 event'
        );
      }

      if (behavior.maximumQueuedEventsBeforeFlushing > 10000) {
        validationWarnings.push(
          'maximumQueuedEventsBeforeFlushing is very high (>10000). ' +
            'This may cause memory issues. Consider setting to 50-200.'
        );
      }
    }

    // Validate flush interval
    if (behavior.flushIntervalMilliseconds !== undefined) {
      if (behavior.flushIntervalMilliseconds < 1000) {
        validationWarnings.push(
          'flushIntervalMilliseconds is very short (<1s). ' +
            'This may cause excessive network requests. Consider 5000-30000ms.'
        );
      }

      if (behavior.flushIntervalMilliseconds > 600000) {
        validationWarnings.push(
          'flushIntervalMilliseconds is very long (>10min). ' +
            'Events may be delayed significantly. Consider 5000-60000ms.'
        );
      }
    }

    // Validate offline queue capacity
    if (behavior.maximumOfflineQueueCapacity !== undefined) {
      if (behavior.maximumOfflineQueueCapacity < 100) {
        validationWarnings.push(
          'maximumOfflineQueueCapacity is small (<100 events). ' +
            'Device may lose events if offline for long. Consider 1000+.'
        );
      }

      if (behavior.maximumOfflineQueueCapacity > 100000) {
        validationWarnings.push(
          'maximumOfflineQueueCapacity is very large (>100k). ' +
            'May cause storage quota issues. Consider 1000-50000.'
        );
      }
    }

    // Validate operating mode
    if (behavior.operatingMode && !['development', 'production'].includes(behavior.operatingMode)) {
      validationErrors.push(
        'operatingMode must be either "development" or "production"'
      );
    }

    // Production warning if debug logging enabled
    if (behavior.enableDetailedDebugLogging && behavior.operatingMode === 'production') {
      validationWarnings.push(
        'Debug logging is enabled in production mode. ' +
          'This may impact performance. Consider disabling for production.'
      );
    }
  }

  /**
   * Validate security and privacy configuration.
   *
   * Checks encryption keys, data retention, and privacy settings.
   *
   * @param configuration The SDK configuration
   * @param validationErrors Array to append errors to
   * @param validationWarnings Array to append warnings to
   */
  private validateSecurityAndPrivacyConfiguration(
    configuration: UserMeshSdkConfiguration,
    validationErrors: string[],
    validationWarnings: string[]
  ): void {
    const security = configuration.securityAndPrivacyConfiguration;

    if (!security) {
      validationWarnings.push(
        'securityAndPrivacyConfiguration not specified. ' +
          'Data encryption is disabled by default. Enable it if handling sensitive data.'
      );
      return;
    }

    // Validate encryption configuration
    if (security.enableDataEncryption) {
      if (!security.encryptionKeyMaterial) {
        validationWarnings.push(
          'Data encryption enabled but encryptionKeyMaterial not provided. ' +
            'SDK will generate a random key, but this key will be lost on page reload. ' +
            'Provide a persistent key for reliable encryption.'
        );
      } else if (security.encryptionKeyMaterial.length < 16) {
        validationErrors.push(
          'encryptionKeyMaterial is too short. Must be at least 16 characters (ideally 43 for base64-encoded 32-byte key)'
        );
      }
    } else {
      validationWarnings.push(
        'Data encryption is disabled. ' +
          'Events stored offline will be in plaintext. Enable if handling sensitive data.'
      );
    }

    // Validate data retention
    if (security.dataRetentionDaysCount !== undefined) {
      if (security.dataRetentionDaysCount < 0) {
        validationErrors.push(
          'dataRetentionDaysCount must be non-negative'
        );
      }

      if (security.dataRetentionDaysCount === 0) {
        validationWarnings.push(
          'dataRetentionDaysCount is 0. Events will be deleted immediately after transmission.'
        );
      }
    }

    // Warn about PII redaction
    if (!security.shouldRedactPersonalInformation) {
      validationWarnings.push(
        'PII redaction is disabled. Emails, phone numbers, and other personal data will be sent to analytics platforms. ' +
          'Enable shouldRedactPersonalInformation if handling GDPR/privacy-sensitive applications.'
      );
    }
  }

  /**
   * Check if at least one analytics platform is enabled.
   *
   * @param configuration The SDK configuration
   * @returns Whether at least one platform is enabled
   */
  private isAtLeastOneAnalyticsPlatformEnabled(configuration: UserMeshSdkConfiguration): boolean {
    const integrations = configuration.analyticsIntegrations;

    if (!integrations) {
      return false;
    }

    return !!(
      integrations.googleAnalytics4?.isEnabled ||
      integrations.postHogPlatform?.isEnabled ||
      integrations.mixpanelPlatform?.isEnabled ||
      integrations.microsoftClarity?.isEnabled ||
      integrations.customAnalyticsEndpoint?.isEnabled
    );
  }

  /**
   * Validate an individual platform credential.
   *
   * Checks basic format validation for API keys and identifiers.
   *
   * @param platformName Name of the platform
   * @param credentialValue The credential to validate
   * @returns Whether the credential appears valid
   */
  isAnalyticsPlatformCredentialValid(platformName: string, credentialValue: string): boolean {
    if (!credentialValue || credentialValue.trim().length === 0) {
      return false;
    }

    // Platform-specific validation
    switch (platformName.toLowerCase()) {
      case 'googleanalytics4':
      case 'ga4':
        // GA4 property IDs start with G- followed by alphanumeric
        return /^G-[A-Z0-9]+$/.test(credentialValue);

      case 'posthog':
        // PostHog keys are typically 32+ character hex strings
        return credentialValue.length >= 20;

      case 'mixpanel':
        // Mixpanel tokens are typically 32 character hex strings
        return /^[a-f0-9]{32}$/.test(credentialValue);

      case 'clarity':
      case 'microsoftclarity':
        // Clarity project IDs are alphanumeric
        return /^[a-z0-9]+$/.test(credentialValue);

      default:
        // For custom platforms, just check non-empty
        return credentialValue.length > 0;
    }
  }
}
