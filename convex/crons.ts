import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'update models',
  { hours: 24 }, // Update models daily
  internal.models.fetchAndUpdateModels
)

// Run Gateway model update 10 minutes after the OpenRouter update
crons.cron(
  'update gateway models',
  '10 0 * * *', // Daily at 00:10 UTC (10 minutes after midnight)
  internal.models.updateGatewayModels
)

export default crons
