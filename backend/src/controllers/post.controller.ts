import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { activityLog } from '../services/activity.service.js';
import { postService } from '../services/post.service.js';
import { createPostSchema, postListQuery, updatePostSchema } from '../validators/post.schema.js';
import { uuidParam } from '../validators/common.schema.js';

export const listPosts = asyncHandler(async (req: Request, res: Response) => {
  const query = postListQuery.parse(req.query);
  const posts = await postService.list(req, query, query.limit, query.page);
  res.json(posts);
});

export const getPost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const post = await postService.getById(req, id);
  res.json(post);
});

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const data = createPostSchema.parse(req.body);
  const post = await postService.create(req, data);
  await activityLog.recordRequest(req, {
    action: 'post.create',
    resource: 'posts',
    resourceId: post.id,
    details: { title: post.title, visibility: post.visibility }
  });
  res.status(201).json(post);
});

export const updatePost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  const data = updatePostSchema.parse(req.body);
  const post = await postService.update(req, id, data);
  await activityLog.recordRequest(req, {
    action: 'post.update',
    resource: 'posts',
    resourceId: id,
    details: { fields: Object.keys(data) }
  });
  res.json(post);
});

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = uuidParam.parse(req.params);
  await postService.remove(req, id);
  await activityLog.recordRequest(req, { action: 'post.delete', resource: 'posts', resourceId: id });
  res.status(204).send();
});
