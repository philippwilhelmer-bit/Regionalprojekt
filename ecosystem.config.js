/**
 * PM2 Ecosystem Configuration
 * Phase 4: Scheduler and Autonomous Publishing
 *
 * Two independent cron jobs:
 *   - ingest-cron:      runs ingest-run.ts on POLL_INTERVAL_MINUTES schedule
 *   - ai-publish-cron:  runs ai-run.ts (dead-man + AI + publish) on same schedule
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 logs
 *   pm2 status
 *
 * IMPORTANT: autorestart must be false for cron-mode apps.
 * ingest-run.ts exits with code 1 when any source fails — PM2 would restart
 * it in a crash loop if autorestart were true.
 *
 * Interval: controlled by POLL_INTERVAL_MINUTES env var (default 15 minutes).
 * Change the cron_restart expressions below when adjusting the interval.
 * Default: every 15 minutes  =>  "* /15 * * * *" (without the space)
 */
module.exports = {
  apps: [
    {
      name: 'ingest-cron',
      script: 'tsx',
      args: 'scripts/ingest-run.ts',
      cron_restart: '*/15 * * * *',
      watch: false,
      autorestart: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'ai-publish-cron',
      script: 'bun',
      args: 'run src/scripts/ai-run.ts',
      cron_restart: '*/15 * * * *',
      watch: false,
      autorestart: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
