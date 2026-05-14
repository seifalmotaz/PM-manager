import { router, protectedProcedure } from '../../trpc'
import { forecastService } from './forecast.service'
import { forProjectSchema } from './forecast.schema'

export const forecastRouter = router({
  forProject: protectedProcedure
    .input(forProjectSchema)
    .query(({ input, ctx }) => forecastService.forProject(input.projectId, ctx.user.id)),
})