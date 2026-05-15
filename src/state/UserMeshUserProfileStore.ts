/**
 * UserMesh User Profile Store
 *
 * Zustand store for managing the current user's profile and identification data.
 * Stores user ID, traits, email, and authentication status.
 *
 * Why: Provides reactive state management for user identification across
 * the SDK and enables automatic user context attachment to all events.
 *
 * When: Used whenever user identification changes or events need to include
 * user context (authenticated user ID or traits).
 */

import { create } from 'zustand';
import type { UserIdentificationProfile } from '../types/UserMeshEventTypes';

/**
 * The UserMesh user profile store state.
 */
export interface UserMeshUserProfileStoreState {
  /**
   * The current authenticated user's profile (if logged in).
   * Undefined if user is not authenticated.
   */
  currentAuthenticatedUserProfile: UserIdentificationProfile | undefined;

  /**
   * Anonymous device identifier for unidentified users.
   * Used before authentication or for users who never sign up.
   */
  anonymousDeviceIdentifierForUnknownUsers: string | undefined;

  /**
   * Whether the user is currently authenticated.
   */
  isUserCurrentlyAuthenticated: boolean;

  /**
   * Timestamp when the user last activity was recorded.
   * Automatically updated by the SDK on every event.
   */
  lastUserActivityTimestampMilliseconds: number;

  /**
   * Set the anonymous device identifier.
   */
  setAnonymousDeviceIdentifier(anonymousIdentifier: string): void;

  /**
   * Identify and set the current user profile.
   */
  setCurrentUserProfile(userProfile: UserIdentificationProfile): void;

  /**
   * Get the current user profile (if authenticated).
   */
  getCurrentUserProfile(): UserIdentificationProfile | undefined;

  /**
   * Get the authenticated user ID (if logged in).
   */
  getAuthenticatedUserId(): string | undefined;

  /**
   * Update user traits/attributes without replacing the entire profile.
   */
  updateUserTraits(newTraits: Record<string, unknown>): void;

  /**
   * Update the last activity timestamp.
   */
  recordUserActivity(): void;

  /**
   * Clear the current user profile (on logout).
   */
  clearCurrentUserProfile(): void;

  /**
   * Check if a user is currently authenticated.
   */
  isUserAuthenticated(): boolean;

  /**
   * Get the anonymous device identifier.
   */
  getAnonymousDeviceIdentifier(): string | undefined;
}

/**
 * Create the UserMesh user profile store.
 *
 * This store manages the currently identified user's profile, including
 * their ID, traits, email, and authentication status.
 *
 * Usage:
 * ```typescript
 * const store = useUserMeshUserProfileStore();
 *
 * store.setCurrentUserProfile({
 *   primaryUserId: 'user_12345',
 *   userTraitsAndAttributes: { accountType: 'premium' },
 *   profileCreationTimestamp: 1234567890,
 *   lastActivityTimestamp: Date.now()
 * });
 *
 * const userId = store.getAuthenticatedUserId(); // 'user_12345'
 * store.updateUserTraits({ accountType: 'enterprise' });
 * ```
 */
export const useUserMeshUserProfileStore = create<UserMeshUserProfileStoreState>((set, get) => ({
  currentAuthenticatedUserProfile: undefined,
  anonymousDeviceIdentifierForUnknownUsers: undefined,
  isUserCurrentlyAuthenticated: false,
  lastUserActivityTimestampMilliseconds: Date.now(),

  setAnonymousDeviceIdentifier: (anonymousIdentifier: string) => {
    set({
      anonymousDeviceIdentifierForUnknownUsers: anonymousIdentifier,
    });
  },

  setCurrentUserProfile: (userProfile: UserIdentificationProfile) => {
    set({
      currentAuthenticatedUserProfile: userProfile,
      isUserCurrentlyAuthenticated: true,
      lastUserActivityTimestampMilliseconds: Date.now(),
    });
  },

  getCurrentUserProfile: () => {
    return get().currentAuthenticatedUserProfile;
  },

  getAuthenticatedUserId: () => {
    return get().currentAuthenticatedUserProfile?.primaryUserId;
  },

  updateUserTraits: (newTraits: Record<string, unknown>) => {
    set((state) => {
      if (!state.currentAuthenticatedUserProfile) {
        return state;
      }

      return {
        currentAuthenticatedUserProfile: {
          ...state.currentAuthenticatedUserProfile,
          userTraitsAndAttributes: {
            ...state.currentAuthenticatedUserProfile.userTraitsAndAttributes,
            ...newTraits,
          },
          lastActivityTimestamp: Date.now(),
        },
        lastUserActivityTimestampMilliseconds: Date.now(),
      };
    });
  },

  recordUserActivity: () => {
    set((state) => ({
      lastUserActivityTimestampMilliseconds: Date.now(),
      currentAuthenticatedUserProfile: state.currentAuthenticatedUserProfile
        ? {
            ...state.currentAuthenticatedUserProfile,
            lastActivityTimestamp: Date.now(),
          }
        : undefined,
    }));
  },

  clearCurrentUserProfile: () => {
    set({
      currentAuthenticatedUserProfile: undefined,
      isUserCurrentlyAuthenticated: false,
      lastUserActivityTimestampMilliseconds: Date.now(),
    });
  },

  isUserAuthenticated: () => {
    return get().isUserCurrentlyAuthenticated;
  },

  getAnonymousDeviceIdentifier: () => {
    return get().anonymousDeviceIdentifierForUnknownUsers;
  },
}));
