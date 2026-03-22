# Crontab Configuration

Alternative to PM2 for operators who prefer OS-level crontab.

## Entries

Add to crontab (`crontab -e`):

```cron
# Regionalprojekt — Ingestion (every 15 minutes)
*/15 * * * * cd /path/to/app && tsx scripts/ingest-run.ts >> /var/log/regionalprojekt/ingest.log 2>&1

# Regionalprojekt — AI + Publish + Dead-Man check (every 15 minutes)
*/15 * * * * cd /path/to/app && bun run src/scripts/ai-run.ts >> /var/log/regionalprojekt/ai-publish.log 2>&1
```

## Env Vars Required

Both jobs inherit the shell environment. Ensure the following are available:

| Variable | Purpose | Default |
|----------|---------|---------|
| DATABASE_URL | PostgreSQL connection string | required |
| ANTHROPIC_API_KEY | Anthropic API key for AI pipeline | required |
| POLL_INTERVAL_MINUTES | Polling interval (adjust cron expression to match) | 15 |
| AI_DAILY_TOKEN_THRESHOLD | Daily token budget before circuit-breaker fires | 500000 |
| DEAD_MAN_THRESHOLD_HOURS | Silence window before dead-man alert fires | 6 |

## PM2 Alternative

See `ecosystem.config.js` in the project root for the PM2-based setup (recommended for production — provides log rotation and structured `pm2 logs` output).
