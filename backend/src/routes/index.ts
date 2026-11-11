import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { usersRouter } from './users.routes.js';
import { rolesRouter } from './roles.routes.js';
import { postsRouter } from './posts.routes.js';
import { mediaRouter } from './media.routes.js';
import { categoriesRouter } from './categories.routes.js';
import { streamsRouter } from './streams.routes.js';
import { statsRouter } from './stats.routes.js';
import { healthRouter } from './health.routes.js';
import { activityRouter } from './activity.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/roles', rolesRouter);
apiRouter.use('/posts', postsRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/streams', streamsRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/activity-logs', activityRouter);
apiRouter.use('/health', healthRouter);
