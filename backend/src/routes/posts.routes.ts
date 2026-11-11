import { Router } from 'express';
import * as controller from '../controllers/post.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

export const postsRouter = Router();

postsRouter.get('/', optionalAuth, controller.listPosts);
postsRouter.get('/:id', optionalAuth, controller.getPost);
postsRouter.post('/', requireAuth, controller.createPost);
postsRouter.put('/:id', requireAuth, controller.updatePost);
postsRouter.delete('/:id', requireAuth, controller.deletePost);
