# Contributing to UserMesh

Author: 钟智强  
Email: ctkqiang@dingtalk.com  
Repository: https://gitcode.com/ctkqiang_sr/UserMesh.git

Thank you for contributing to UserMesh! This document provides guidelines for contributing.

## Getting Started

### Prerequisites

- Node.js 18+
- Bun or npm
- Git

### Setup Development Environment

```bash
# Clone repository
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git
cd UserMesh

# Install dependencies
bun install
# or
npm install

# Run tests
bun test

# Run type checking
bun run type-check

# Run linting
bun run lint

# Run formatter
bun run format
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bugfix
```

Use descriptive branch names:
- `feature/` for new features
- `fix/` for bug fixes
- `docs/` for documentation
- `test/` for tests
- `refactor/` for refactoring

### 2. Make Your Changes

Follow these conventions:

#### Code Style

1. **Use Long, Descriptive Names**
   ```typescript
   // Good
   const shouldEncryptSensitiveDataBeforePersistence = true;
   
   // Bad
   const encrypt = true;
   ```

2. **Add Comprehensive Comments**
   ```typescript
   /**
    * Why: Prevents queue from growing unbounded
    * When: Called every 5 seconds or after 20 events
    */
   async flushQueuedEventsToAnalyticsPlatforms(): Promise<void> {
     // Implementation
   }
   ```

3. **Use Type Safety**
   - Always define parameter types
   - Always define return types
   - Use strict TypeScript mode
   - No `any` types without explanation

#### File Organization

- Keep files focused on single responsibility
- Place related code in appropriate folders
- Follow existing naming conventions
- Maximum ~500 lines per file

#### Testing

Write tests for new functionality:

```typescript
// tests/unit/myFeature.test.ts
import { describe, it, expect } from 'vitest';
import { MyFeature } from '../src/myFeature';

describe('MyFeature', () => {
  it('should do something correctly', () => {
    const feature = new MyFeature();
    const result = feature.doSomething();
    expect(result).toBe(expectedValue);
  });

  it('should handle edge cases', () => {
    // Test edge cases
  });
});
```

### 3. Commit Your Changes

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `style:` Code style (formatting, missing semi-colons, etc)
- `chore:` Build process, dependencies, etc

Examples:
```bash
git commit -m "feat(validation): add custom validation rule support"
git commit -m "fix(encryption): handle key rotation correctly"
git commit -m "docs: add API reference examples"
```

### 4. Push and Create Pull Request

```bash
git push origin feature/my-feature
```

Then create a pull request with:
- Clear title describing the change
- Description of what and why
- Any related issues
- Testing instructions

## Code Quality Standards

### TypeScript

- Use strict mode (`"strict": true` in tsconfig.json)
- No implicit `any`
- All public APIs must have types
- Export types alongside implementations

### Documentation

All public APIs must include:

```typescript
/**
 * One-line summary
 *
 * Detailed explanation of what this does
 *
 * Why: The motivation or use case
 * When: When this should be called
 * How: How it works and constraints
 *
 * @param paramName Description of parameter
 * @returns Description of return value
 * @throws Error description
 *
 * @example
 * ```typescript
 * const result = await function(param);
 * ```
 */
async function myPublicFunction(paramName: string): Promise<string> {
  // Implementation
}
```

### Testing

- Aim for >80% code coverage
- Test happy paths, error cases, and edge cases
- Test async/await with proper awaits
- Mock external dependencies
- Use descriptive test names

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should return correct value when called with valid input', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = method(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should throw error when called with invalid input', () => {
      expect(() => method(null)).toThrow();
    });
  });
});
```

### Performance

- Avoid unnecessary re-renders in React
- Batch operations where possible
- Use efficient data structures
- Profile before optimizing
- Document performance implications

## Architecture Guidelines

### Layering

UserMesh follows a clean architecture approach:

```
┌─────────────────┐
│  Public API     │  SDK Client, Hooks
├─────────────────┤
│  Domain Logic   │  Validation, Encryption, State
├─────────────────┤
│  Infrastructure │  Storage, HTTP, Utilities
└─────────────────┘
```

### Dependencies

- Keep external dependencies minimal
- Prefer single-responsibility libraries
- Avoid circular dependencies
- Document why each dependency is needed

### Interfaces

Define clear contracts:

```typescript
// Public interface
export interface MyFeature {
  doSomething(param: string): Promise<Result>;
}

// Implementation
export class MyFeatureImpl implements MyFeature {
  async doSomething(param: string): Promise<Result> {
    // Implementation
  }
}
```

## Review Process

### What We Look For

1. **Code Quality**
   - Follows style guide
   - Well-tested
   - Well-documented
   - No dead code

2. **Design**
   - Solves the problem
   - Doesn't break existing APIs
   - Handles edge cases
   - Performance acceptable

3. **Testing**
   - Tests are clear and comprehensive
   - Edge cases covered
   - No flaky tests

4. **Documentation**
   - README updated if needed
   - Code comments explain why
   - Examples added if complex

### Feedback

Reviews are constructive. We provide:
- Specific feedback with examples
- Suggestions for improvement
- Reasoning behind feedback
- Recognition of good work

## Phase Implementation

UserMesh is implemented in phases:

### Phase 1: Foundation (COMPLETE)
- Core SDK class
- Type definitions
- State management
- Encryption & validation
- Offline persistence

### Phase 2: Analytics Connectors (IN PROGRESS)
- Google Analytics 4
- PostHog
- Mixpanel
- Microsoft Clarity
- Custom endpoints

### Phase 3: Domain-Specific Events (PLANNED)
- Finance events
- Social media events
- E-commerce events
- SaaS events

### Phase 4: React Hooks (PLANNED)
- useUserMeshAnalytics
- useUserMeshEventTracking
- useUserMeshUserManagement

### Phase 5: Testing & Docs (PLANNED)
- Unit tests
- Integration tests
- E2E tests
- Complete documentation

## Reporting Issues

Found a bug? Have a feature request?

1. Check if issue already exists
2. Provide clear reproduction steps
3. Include environment details
4. Attach error messages/logs

## Documentation

### When to Write Docs

- New public APIs
- New configuration options
- Breaking changes
- Complex concepts
- Setup/integration guides

### Where Docs Live

- **README.md** - Overview and quick start
- **DEVELOPER_GUIDE.md** - Concepts and examples
- **API_REFERENCE.md** - Complete API documentation
- **EXAMPLES.md** - Real-world examples
- **Code Comments** - Implementation details

### Documentation Standards

- Clear language, avoid jargon
- Real examples, not pseudocode
- Explain WHAT, WHY, and WHEN
- Link related documentation
- Keep up-to-date with code

## Performance Guidelines

### Optimization Focus

1. **Event Processing** - Keep fast, <10ms per event
2. **Storage Operations** - Keep fast, <5ms per operation
3. **Offline Queue** - Minimize memory footprint
4. **Encryption** - Balance security and speed

### Benchmarking

```bash
# Run performance benchmarks
bun run bench

# Profile specific operation
bun run profile:eventQueue
```

## Security Considerations

### Areas of Focus

1. **Encryption** - AES-256-GCM implementation
2. **Key Management** - Secure key generation and storage
3. **Data Privacy** - PII redaction and retention policies
4. **Input Validation** - Prevent injection attacks
5. **Dependency Security** - Regular updates and audits

### Security Review

Security-critical changes require review from project maintainers.

## Release Process

### Version Numbering

Follow semantic versioning: MAJOR.MINOR.PATCH

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Creating a Release

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Run full test suite
5. Build package
6. Publish to npm

## Community

### Code of Conduct

- Be respectful and inclusive
- Constructive feedback only
- No harassment or discrimination
- Report issues to maintainers

### Getting Help

- Check documentation first
- Search existing issues
- Ask in discussions
- Email: ctkqiang@dingtalk.com

## Resources

- [Developer Guide](./DEVELOPER_GUIDE.md) - Concepts and examples
- [API Reference](./API_REFERENCE.md) - Complete API docs
- [Examples](./EXAMPLES.md) - Real-world examples
- [Architecture](./ARCHITECTURE.md) - System design (coming soon)

## Questions?

Feel free to reach out:
- Email: ctkqiang@dingtalk.com
- Repository: https://gitcode.com/ctkqiang_sr/UserMesh.git

Thank you for contributing to UserMesh!
