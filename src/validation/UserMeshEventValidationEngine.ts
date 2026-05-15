/**
 * UserMesh Event Validation Engine
 *
 * Validates analytics events before they are queued, stored, or transmitted
 * to analytics platforms. Ensures data quality and prevents invalid data
 * from corrupting the analytics pipeline.
 *
 * Why: Validation catches errors early and prevents downstream failures
 * in analytics platforms when invalid events are sent.
 *
 * When: Called after an event is recorded but before it is queued or stored.
 * Returns validation results that indicate success or specific errors.
 */

import type {
  AnalyticsEventRecord,
  EventValidationResult,
  UserIdentificationProfile,
} from '../types/UserMeshEventTypes';

/**
 * A single validation rule that checks one aspect of event data.
 */
export interface EventValidationRule {
  /**
   * Name of the validation rule (e.g., "event_name_required").
   */
  ruleIdentifier: string;

  /**
   * Human-readable description of what this rule checks.
   */
  ruleDescription: string;

  /**
   * Function that performs the validation check.
   * Returns true if valid, false if invalid.
   */
  performValidationCheck(event: AnalyticsEventRecord): boolean;

  /**
   * Error message to include if validation fails.
   */
  failureErrorMessage: string;

  /**
   * Whether this is a critical rule (event should be rejected if fails)
   * vs a warning rule (event proceeds but is logged).
   */
  isValidationRuleCritical: boolean;
}

/**
 * UserMesh Event Validation Engine
 *
 * Provides comprehensive validation of analytics events, user profiles,
 * and configuration objects before they're used in the SDK.
 *
 * Usage:
 * ```typescript
 * const eventValidator = new UserMeshEventValidator();
 *
 * const validationResult = eventValidator.validateAnalyticsEventRecord(event);
 * if (!validationResult.isEventValid) {
 *   console.error('Event validation failed:', validationResult.validationErrorMessages);
 * }
 * ```
 */
export class UserMeshEventValidator {
  /**
   * The set of validation rules applied to all events.
   */
  private eventValidationRulesCollection: EventValidationRule[];

  /**
   * Whether to be strict about validation failures.
   * In strict mode, any validation failure rejects the event.
   * In lenient mode, only critical failures cause rejection.
   */
  private strictValidationMode: boolean;

  /**
   * Constructor for event validator.
   *
   * @param validationModeIsStrict Whether to use strict validation
   */
  constructor(validationModeIsStrict: boolean = true) {
    this.strictValidationMode = validationModeIsStrict;
    this.eventValidationRulesCollection = this.createDefaultValidationRules();
  }

  /**
   * Validate a complete analytics event record.
   *
   * Checks all required fields, data types, and business logic constraints.
   *
   * Why: Ensures events meet platform requirements before transmission.
   * When: Called immediately after event creation but before queuing.
   *
   * @param eventToValidate The event to validate
   * @returns Validation result with status and error details
   */
  validateAnalyticsEventRecord(
    eventToValidate: AnalyticsEventRecord
  ): EventValidationResult {
    const validationErrors: string[] = [];
    let shouldRejectEvent = false;

    for (const validationRule of this.eventValidationRulesCollection) {
      const rulePassedValidation = validationRule.performValidationCheck(eventToValidate);

      if (!rulePassedValidation) {
        validationErrors.push(validationRule.failureErrorMessage);

        if (validationRule.isValidationRuleCritical || this.strictValidationMode) {
          shouldRejectEvent = true;
        }
      }
    }

    return {
      isEventValid: !shouldRejectEvent && validationErrors.length === 0,
      validationErrorMessages: validationErrors,
      processedEventData: eventToValidate,
    };
  }

  /**
   * Validate a user profile before identification.
   *
   * Ensures user ID is present and traits are valid.
   *
   * @param userProfileToValidate The user profile to validate
   * @returns Whether the profile is valid
   */
  validateUserIdentificationProfile(
    userProfileToValidate: UserIdentificationProfile
  ): { isProfileValid: boolean; validationErrorMessages: string[] } {
    const validationErrors: string[] = [];

    if (!userProfileToValidate.primaryUserId || userProfileToValidate.primaryUserId.trim().length === 0) {
      validationErrors.push('User profile missing required primaryUserId field');
    }

    if (!userProfileToValidate.userTraitsAndAttributes || typeof userProfileToValidate.userTraitsAndAttributes !== 'object') {
      validationErrors.push('User profile userTraitsAndAttributes must be an object');
    }

    if (userProfileToValidate.profileCreationTimestamp < 0 || !Number.isInteger(userProfileToValidate.profileCreationTimestamp)) {
      validationErrors.push('User profile profileCreationTimestamp must be a positive integer');
    }

    if (userProfileToValidate.lastActivityTimestamp < 0 || !Number.isInteger(userProfileToValidate.lastActivityTimestamp)) {
      validationErrors.push('User profile lastActivityTimestamp must be a positive integer');
    }

    if (userProfileToValidate.emailAddressForUser) {
      const isEmailValid = this.validateEmailAddressFormat(userProfileToValidate.emailAddressForUser);
      if (!isEmailValid) {
        validationErrors.push(
          `Invalid email format in user profile: "${userProfileToValidate.emailAddressForUser}"`
        );
      }
    }

    return {
      isProfileValid: validationErrors.length === 0,
      validationErrorMessages: validationErrors,
    };
  }

  /**
   * Check if an event name is valid.
   *
   * Valid names are lowercase with underscores only, 1-64 characters.
   *
   * @param eventNameToValidate The event name to check
   * @returns Whether the name is valid
   */
  isEventNameValid(eventNameToValidate: string): boolean {
    if (!eventNameToValidate || eventNameToValidate.length === 0) {
      return false;
    }

    if (eventNameToValidate.length > 64) {
      return false;
    }

    const validEventNamePattern = /^[a-z0-9_]+$/;
    return validEventNamePattern.test(eventNameToValidate);
  }

  /**
   * Check if event properties are valid and safe.
   *
   * Properties should be JSON-serializable and not contain
   * functions, circular references, or other problematic types.
   *
   * @param propertiesToValidate The properties object to check
   * @returns Whether the properties are valid
   */
  areEventPropertiesValid(propertiesToValidate: Record<string, unknown>): boolean {
    try {
      // Attempt JSON serialization - this will fail if properties are not JSON-safe
      JSON.stringify(propertiesToValidate);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate email address format.
   *
   * Simple validation - for production, use a library or backend validation.
   *
   * @param emailAddressToValidate The email to validate
   * @returns Whether email format appears valid
   */
  private validateEmailAddressFormat(emailAddressToValidate: string): boolean {
    const emailValidationPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailValidationPattern.test(emailAddressToValidate);
  }

  /**
   * Create the default set of validation rules.
   *
   * These rules ensure all events meet baseline requirements.
   *
   * @returns Array of validation rules
   */
  private createDefaultValidationRules(): EventValidationRule[] {
    return [
      {
        ruleIdentifier: 'unique_event_identifier_required',
        ruleDescription: 'Event must have a unique event identifier (UUID)',
        performValidationCheck: (event) => {
          return event.uniqueEventIdentifier && event.uniqueEventIdentifier.length > 0;
        },
        failureErrorMessage:
          'Event validation failed: uniqueEventIdentifier is required and must be a non-empty UUID',
        isValidationRuleCritical: true,
      },
      {
        ruleIdentifier: 'event_timestamp_valid',
        ruleDescription: 'Event timestamp must be valid millisecond timestamp',
        performValidationCheck: (event) => {
          return (
            Number.isInteger(event.eventTimestampMilliseconds) &&
            event.eventTimestampMilliseconds > 0 &&
            event.eventTimestampMilliseconds < Date.now() + 60000 // Allow 60s future drift for clock skew
          );
        },
        failureErrorMessage:
          'Event validation failed: eventTimestampMilliseconds must be valid Unix milliseconds timestamp',
        isValidationRuleCritical: true,
      },
      {
        ruleIdentifier: 'event_name_valid',
        ruleDescription: 'Event name must be lowercase with underscores',
        performValidationCheck: (event) => {
          return this.isEventNameValid(event.analyticsEventName);
        },
        failureErrorMessage:
          'Event validation failed: analyticsEventName must be 1-64 lowercase characters and underscores only',
        isValidationRuleCritical: true,
      },
      {
        ruleIdentifier: 'session_identifier_required',
        ruleDescription: 'Event must have a session identifier',
        performValidationCheck: (event) => {
          return event.currentSessionIdentifier && event.currentSessionIdentifier.length > 0;
        },
        failureErrorMessage: 'Event validation failed: currentSessionIdentifier is required',
        isValidationRuleCritical: true,
      },
      {
        ruleIdentifier: 'context_information_present',
        ruleDescription: 'Event must have context information',
        performValidationCheck: (event) => {
          return (
            event.contextInformation &&
            event.contextInformation.applicationPlatform &&
            event.contextInformation.softwareDevelopmentKitVersion
          );
        },
        failureErrorMessage:
          'Event validation failed: contextInformation with applicationPlatform and softwareDevelopmentKitVersion required',
        isValidationRuleCritical: true,
      },
      {
        ruleIdentifier: 'event_properties_json_safe',
        ruleDescription: 'Event properties must be JSON-serializable',
        performValidationCheck: (event) => {
          return this.areEventPropertiesValid(event.eventPropertiesData);
        },
        failureErrorMessage:
          'Event validation failed: eventPropertiesData must be JSON-serializable (no functions or circular references)',
        isValidationRuleCritical: true,
      },
      {
        ruleIdentifier: 'user_identification_logical',
        ruleDescription: 'Event should have either authenticated user or anonymous identifier',
        performValidationCheck: (event) => {
          return event.authenticatedUserId || event.anonymousSessionIdentifier;
        },
        failureErrorMessage:
          'Event validation warning: event has neither authenticatedUserId nor anonymousSessionIdentifier (anonymous tracking disabled?)',
        isValidationRuleCritical: false,
      },
    ];
  }

  /**
   * Add a custom validation rule to the engine.
   *
   * Allows applications to add domain-specific validation logic.
   *
   * @param customValidationRule The rule to add
   */
  addCustomValidationRule(customValidationRule: EventValidationRule): void {
    this.eventValidationRulesCollection.push(customValidationRule);
  }

  /**
   * Clear all validation rules and reset to defaults.
   *
   * Used in testing or when validation needs to be reset.
   */
  resetToDefaultValidationRules(): void {
    this.eventValidationRulesCollection = this.createDefaultValidationRules();
  }

  /**
   * Get current validation rules.
   *
   * Useful for debugging or logging which rules are active.
   *
   * @returns Current set of validation rules
   */
  getCurrentValidationRules(): EventValidationRule[] {
    return [...this.eventValidationRulesCollection];
  }
}
