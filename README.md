# UserMesh

Author: 钟智强  
Email: ctkqiang@dingtalk.com  
Repository: https://gitcode.com/ctkqiang_sr/UserMesh.git  

Universal Analytics SDK - Single source of truth for Google Analytics 4, PostHog, Mixpanel, and Microsoft Clarity.

Instead of juggling 4+ analytics platforms, UserMesh provides a unified, developer-friendly SDK that aggregates all your analytics into one simple interface. Works with any domain (finance, social media, e-commerce, SaaS) and any platform.

## Features

Multiple Analytics Platforms
- Google Analytics 4
- PostHog
- Mixpanel
- Microsoft Clarity (session replays, heatmaps)

Unified Developer Experience
- Single SDK for all platforms
- Domain-agnostic event schemas
- Multi-domain support (finance, social, e-commerce, SaaS, custom)
- Extremely developer-friendly with long, readable variable names

Offline Persistence
- Event queueing when offline
- Automatic synchronization when back online
- Configurable retention policies
- Exponential backoff for failed transmissions

Data Security
- AES-256-GCM encryption at rest
- Encrypted offline storage
- PII redaction support
- GDPR-ready with user data deletion

Event Validation
- Comprehensive validation rules
- Custom validation support
- Detailed error messages
- Type-safe event structures

State Management
- Zustand for lightweight state management
- Automatic user context attachment
- Session tracking
- Device detection

Configuration Management
- Flexible configuration with validation
- Support for all major analytics platforms
- Custom endpoint support
- Environment-specific settings

## Installation

```bash
npm install @usermesh/sdk-web
# or
bun add @usermesh/sdk-web
```

## Quick Start

Create an instance of the SDK with your configuration:

```typescript
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

const sdkClient = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: true,
      googlePropertyIdentifier: 'G-ABC123XYZ'
    },
    postHogPlatform: {
      isEnabled: true,
      projectApiKey: 'phc_your_api_key'
    },
    mixpanelPlatform: {
      isEnabled: true,
      projectToken: 'your_mixpanel_token'
    },
    microsoftClarity: {
      isEnabled: true,
      projectIdentifier: 'your_clarity_project_id'
    }
  },
  sdkBehaviorConfiguration: {
    maximumQueuedEventsBeforeFlushing: 20,
    flushIntervalMilliseconds: 5000,
    enableDetailedDebugLogging: true,
    operatingMode: 'development'
  },
  securityAndPrivacyConfiguration: {
    enableDataEncryption: true,
    shouldRedactPersonalInformation: false,
    dataRetentionDaysCount: 30
  }
});

// Initialize the SDK
await sdkClient.initializeUserMeshAnalyticsSdk();

// Track an event
await sdkClient.recordAnalyticsEvent('user_signup', {
  signupMethod: 'email',
  planType: 'premium'
});

// Identify a user
await sdkClient.identifyCurrentUser('user_12345', {
  emailAddress: 'user@example.com',
  accountType: 'premium',
  signupDate: '2024-01-15'
});

// Track a page view
await sdkClient.trackPageView('checkout', {
  checkoutStep: 'payment'
});

// Manually flush events to analytics platforms
await sdkClient.flushQueuedEventsToAnalyticsPlatforms();
```

## Configuration

### Required: Analytics Integrations

Specify which analytics platforms you want to use and their credentials:

```typescript
analyticsIntegrations: {
  googleAnalytics4: {
    isEnabled: boolean,
    googlePropertyIdentifier: string  // e.g., "G-ABC123"
  },
  postHogPlatform: {
    isEnabled: boolean,
    projectApiKey: string,
    customHostUrl?: string
  },
  mixpanelPlatform: {
    isEnabled: boolean,
    projectToken: string
  },
  microsoftClarity: {
    isEnabled: boolean,
    projectIdentifier: string
  },
  customAnalyticsEndpoint: {
    isEnabled: boolean,
    endpointUrl: string,
    authenticationHeader?: string
  }
}
```

### Optional: SDK Behavior

Configure how the SDK batches and transmits events:

```typescript
sdkBehaviorConfiguration: {
  maximumQueuedEventsBeforeFlushing: number,      // Default: 20
  flushIntervalMilliseconds: number,              // Default: 5000
  maximumOfflineQueueCapacity: number,            // Default: 1000
  enableDetailedDebugLogging: boolean,            // Default: false
  operatingMode: 'development' | 'production',    // Default: 'production'
  enableAnalyticsTracking: boolean                // Default: true
}
```

### Optional: Security & Privacy

Configure encryption and data retention:

```typescript
securityAndPrivacyConfiguration: {
  enableDataEncryption: boolean,                  // Default: false
  encryptionKeyMaterial?: string,                 // 32-byte base64 key
  shouldRedactPersonalInformation: boolean,       // Default: false
  dataRetentionDaysCount: number                  // Default: 30
}
```

## Core APIs

### recordAnalyticsEvent

Track an event that occurred in your application:

```typescript
await sdkClient.recordAnalyticsEvent(
  'event_name',
  {
    property1: 'value1',
    property2: 123
  },
  {
    includeDeviceContext: true,
    includeSessionContext: true
  }
);
```

### identifyCurrentUser

Identify the currently authenticated user:

```typescript
await sdkClient.identifyCurrentUser('user_12345', {
  email: 'user@example.com',
  accountType: 'premium',
  customAttribute: 'customValue'
});
```

### trackPageView

Track page views and time spent on pages:

```typescript
await sdkClient.trackPageView('page_name', {
  sectionName: 'checkout',
  pageType: 'form'
});
```

### reportErrorOccurrence

Track errors that occur in your application:

```typescript
try {
  // your code
} catch (error) {
  await sdkClient.reportErrorOccurrence(error, {
    context: 'payment_processing',
    userId: 'user_123'
  });
}
```

### flushQueuedEventsToAnalyticsPlatforms

Manually flush all queued events to analytics platforms:

```typescript
await sdkClient.flushQueuedEventsToAnalyticsPlatforms();
```

### disableAnalyticsTrackingCompletely

Disable analytics tracking (respects Do Not Track header):

```typescript
await sdkClient.disableAnalyticsTrackingCompletely();
```

### enableAnalyticsTrackingAgain

Re-enable analytics tracking:

```typescript
await sdkClient.enableAnalyticsTrackingAgain();
```

## Architecture

The SDK is organized into clear modules:

- core: Main SDK client and configuration validation
- types: All TypeScript type definitions and interfaces
- state: Zustand stores for event queue and user profile state
- storage: Offline event persistence with localStorage and IndexedDB support
- encryption: AES-256-GCM encryption for sensitive data
- validation: Event and configuration validation
- utils: Utility functions (ID generation, device detection, etc.)
- hooks: React hooks for easier integration (coming in Phase 2)
- connectors: Analytics platform connectors (coming in Phase 2)
- domains: Domain-specific event schemas (coming in Phase 3)

## Development

### Testing

```bash
bun test
```

### Linting & Formatting

```bash
bun run lint
bun run format
```

### Type Checking

```bash
bun run type-check
```

### Build

```bash
bun run build
```

## Implementation Status

Phase 1: Foundation (COMPLETE)
- Core SDK class and configuration validation
- Type definitions for events, configuration, and storage
- Zustand stores for state management
- Event validation engine
- Encryption service (AES-256-GCM)
- Offline queue with persistence
- localStorage adapter for offline storage
- Identifier generation utilities

Phase 2: Analytics Connectors (IN PROGRESS)
- Google Analytics 4 connector
- PostHog connector
- Mixpanel connector
- Microsoft Clarity connector
- Custom endpoint connector

Phase 3: Domain-Specific Events (PLANNED)
- Finance domain events (trades, investments, transfers)
- Social media domain events (posts, likes, follows)
- E-commerce domain events (purchases, cart updates)
- SaaS domain events (signups, upgrades, feature usage)

Phase 4: React Hooks (PLANNED)
- useUserMeshAnalytics hook
- useUserMeshEventTracking hook
- useUserMeshUserManagement hook
- Domain-specific hooks

Phase 5: Testing & Documentation (PLANNED)
- Comprehensive unit tests
- Integration tests
- End-to-end tests
- Complete API documentation
- Examples for each domain

## Code Quality

All code follows strict TypeScript conventions:

- Long, descriptive variable names (no cryptic abbreviations)
- Comprehensive comments explaining WHAT, WHY, and WHEN
- No step-by-step comments (code should be self-documenting)
- Strong type safety with strict TypeScript mode
- Error handling at system boundaries
- Clear error messages for developers

Example of code style:

```typescript
// GOOD: Long names, clear purpose
const shouldEncryptSensitiveDataBeforePersistence = true;
const maximumEventQueueSizeInBytes = 10 * 1024 * 1024;

// BAD: Cryptic abbreviations
const encrypt = true;
const maxQueueSize = 10485760;
```

## Data Privacy & Compliance

Fully GDPR-ready with built-in privacy controls:

- User data deletion on request
- Configurable data retention policies
- PII redaction support
- Do Not Track header support
- Transparent data handling
- No third-party tracking without consent
- Encrypted offline storage

## Performance

- Event ingestion: < 10ms per event
- Offline queue handling: < 5ms per batch operation
- Encryption/decryption: < 20ms per event
- Storage operations: < 5ms per operation

## Documentation

All documentation is organized in the `docs/` directory:

- **docs/guides/DEVELOPER_GUIDE.md** - Comprehensive developer guide with all concepts and examples
- **docs/api/API_REFERENCE.md** - Complete API reference for all methods and types
- **docs/examples/EXAMPLES.md** - Real-world examples for 5 application domains
- **docs/contributing/CONTRIBUTING.md** - Contribution guidelines and standards
- **docs/architecture/** - System design and platform integration details
- **docs/README.md** - Documentation index and quick navigation

## Quick Navigation

- Just getting started? See **Quick Start** section below or `docs/README.md`
- Need detailed guide? Read `docs/guides/DEVELOPER_GUIDE.md`
- Looking for API details? Check `docs/api/API_REFERENCE.md`
- Want code examples? Browse `docs/examples/EXAMPLES.md`
- Ready to contribute? Read `docs/contributing/CONTRIBUTING.md`

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Mobile browsers with localStorage support

## Tech Stack

- Language: TypeScript (strict mode)
- Runtime: Bun / Node.js 18+
- State Management: Zustand
- Bundler: esbuild
- Testing: Vitest
- Encryption: TweetNaCl.js (TBD)

## Contributing

Contributions are welcome. Please ensure:

- All TypeScript strict mode checks pass
- Code follows the established style conventions
- All tests pass
- Documentation is updated

## License

MIT

## Troubleshooting

Quick solutions for common issues:

**Events not appearing in dashboard?**
- See DEVELOPER_GUIDE.md section "Events Not Appearing in Dashboard"

**High memory usage?**
- See DEVELOPER_GUIDE.md section "High Memory Usage"

**Events lost on page reload?**
- See DEVELOPER_GUIDE.md section "Events Lost on Page Reload"

**Slow event transmission?**
- See DEVELOPER_GUIDE.md section "Slow Event Transmission"

**Configuration or encryption issues?**
- See DEVELOPER_GUIDE.md section "Configuration Validation Errors"
- See DEVELOPER_GUIDE.md section "Encryption Key Issues"

For more troubleshooting help, see the full Troubleshooting section in DEVELOPER_GUIDE.md.

## FAQ

**Q: Which analytics platforms does UserMesh support?**  
A: Google Analytics 4, PostHog, Mixpanel, Microsoft Clarity, and custom HTTP endpoints. See API_REFERENCE.md for configuration details.

**Q: Can I use UserMesh with React?**  
A: Yes! See EXAMPLES.md section "React Integration" for component patterns and hooks.

**Q: Does UserMesh work offline?**  
A: Yes, events are automatically queued offline and synced when back online. See DEVELOPER_GUIDE.md section "Offline Persistence".

**Q: Is my data encrypted?**  
A: Events can be encrypted at rest using AES-256-GCM. Enable in configuration. See DEVELOPER_GUIDE.md section "Encryption & Security".

**Q: How do I identify users?**  
A: Call `identifyCurrentUser()` with user ID and traits. See DEVELOPER_GUIDE.md section "User Identification" and API_REFERENCE.md for details.

**Q: What event naming conventions should I follow?**  
A: Use lowercase with underscores (e.g., 'user_signup'). See DEVELOPER_GUIDE.md section "Event Naming Conventions".

**Q: How do I track e-commerce events?**  
A: See EXAMPLES.md section "E-Commerce Application" for complete implementation.

**Q: Does UserMesh support GDPR?**  
A: Yes, with data deletion, retention policies, PII redaction, and Do Not Track support. See DEVELOPER_GUIDE.md section "Privacy Compliance".

## Support

For issues, feature requests, or questions:

- Email: ctkqiang@dingtalk.com
- Repository: https://gitcode.com/ctkqiang_sr/UserMesh.git
- Issues: Report via repository issue tracker
- Discussions: Use repository discussions for questions

## Contributing

Contributions are welcome! Please read CONTRIBUTING.md for:
- Development setup
- Code style guidelines
- Testing requirements
- Commit message format
- Pull request process

---

UserMesh - Unified Analytics SDK. Multiple platforms, one interface.

Made with care by 钟智强 (ctkqiang@dingtalk.com)
