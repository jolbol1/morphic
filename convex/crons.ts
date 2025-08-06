import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'update models',
  { hours: 24 }, // Update models daily
  internal.models.fetchAndUpdateModels
)

export default crons
