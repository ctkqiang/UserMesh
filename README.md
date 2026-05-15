# UserMesh

**Unified Analytics Platform** - Single source of truth for Google Analytics 4, PostHog, Mixpanel, and Microsoft Clarity.

Instead of juggling 4+ analytics platforms, UserMesh aggregates all your data into one powerful, self-hosted data warehouse.

## Features

✅ **Multi-Source Analytics**
- Google Analytics 4
- PostHog  
- Mixpanel
- Microsoft Clarity (session replays, heatmaps)

✅ **Unified Data Warehouse**
- Self-hosted on your infrastructure
- TimeSeries DB (QuestDB) for events
- PostgreSQL for user profiles & metadata
- Full data ownership & privacy

✅ **Advanced Analytics**
- Cross-platform funnels & cohorts
- User journey analysis
- Retention & churn prediction
- LTV calculation
- Feature flags & A/B testing

✅ **Real-time Dashboards**
- Custom dashboard builder
- Pre-built templates
- Real-time metrics updates
- Shareable reports

✅ **API & Integrations**
- RESTful API for queries
- gRPC streaming
- Webhooks for real-time updates
- Export to data warehouse tools

## Quick Start

### Install Dependencies
```bash
bun install
```

### Configuration

Create `.env` file:
```env
# Database
QUESTDB_HOST=localhost
QUESTDB_PORT=8812

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=usermesh
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Cache
REDIS_HOST=localhost
REDIS_PORT=6379

# Integrations
GA4_PROPERTY_ID=your-ga4-property-id
GA4_CREDENTIALS={...google-service-account-json...}

POSTHOG_PROJECT_ID=your-project-id
POSTHOG_API_KEY=your-api-key

MIXPANEL_TOKEN=your-token
MIXPANEL_SECRET_KEY=your-secret-key

CLARITY_PROJECT_ID=your-project-id
CLARITY_API_KEY=your-api-key

# Server
PORT=3000
NODE_ENV=development
```

### Start Development Server

```bash
bun run dev
```

This starts:
- API server on `http://localhost:3000`
- Data sync pipelines
- Real-time streaming listeners

### Deploy

```bash
# Build
bun run build

# Run production
bun run start
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

See [INTEGRATIONS.md](./INTEGRATIONS.md) for integration specifications.

## API Endpoints

### Data Ingestion
- `POST /api/v1/events` - Ingest custom events
- `POST /api/v1/identify` - User identification
- `POST /api/v1/sync` - Trigger manual sync

### Queries
- `POST /api/v1/query` - Execute analytics query
- `GET /api/v1/query/{id}/results` - Get cached results
- `GET /api/v1/events` - List events
- `GET /api/v1/users/{userId}` - Get user profile

### Dashboards
- `GET /api/v1/dashboards` - List dashboards
- `POST /api/v1/dashboards` - Create dashboard
- `GET /api/v1/dashboards/{id}` - Get dashboard
- `PATCH /api/v1/dashboards/{id}` - Update dashboard

### Admin
- `POST /api/v1/projects` - Create project
- `POST /api/v1/integrations/{source}/connect` - Connect data source
- `GET /api/v1/integrations/{source}/status` - Check sync status

## Data Privacy & Compliance

✅ **GDPR Ready**
- User data deletion
- Data retention policies
- PII redaction

✅ **SOC 2 Compliant**
- Encryption at rest & in transit
- Access controls
- Audit logging

✅ **Self-Hosted**
- No data leaves your infrastructure
- Full compliance control
- Zero third-party tracking

## Tech Stack

- **Runtime**: Bun (fast JavaScript runtime)
- **Framework**: Hono (lightweight web server)
- **TimeSeries DB**: QuestDB (OLAP database)
- **Metadata DB**: PostgreSQL
- **Cache**: Redis
- **Message Queue**: Kafka (optional, for high-volume)
- **Language**: TypeScript

## Documentation

- [API Documentation](./docs/api.md)
- [Integration Guide](./INTEGRATIONS.md)
- [Architecture Design](./ARCHITECTURE.md)
- [Deployment Guide](./docs/deployment.md)

## Development

### Testing
```bash
bun test
```

### Linting
```bash
bun run lint
bun run format
```

### Docker Setup
```bash
docker-compose up
```

## Performance

- Event ingestion: <100ms p99
- Query response: <5s p95
- Data sync latency: 5-15 minutes
- API availability: 99.9%

## License

MIT

## Support

- GitHub Issues: [Report bugs](https://github.com/your-org/usermesh/issues)
- Discussions: [Feature requests](https://github.com/your-org/usermesh/discussions)
- Email: support@usermesh.com

---

**UserMesh** - Unified Analytics. Own Your Data. 🚀
