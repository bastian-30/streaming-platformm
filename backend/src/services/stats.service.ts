import { statsModel } from '../models/stats.model.js';

export const statsService = {
  async overview() {
    const [overview, mediaByType, streamsByStatus, postsByVisibility] = await Promise.all([
      statsModel.overview(),
      statsModel.mediaByType(),
      statsModel.streamsByStatus(),
      statsModel.postsByVisibility()
    ]);
    return {
      overview,
      media_by_type: mediaByType,
      streams_by_status: streamsByStatus,
      posts_by_visibility: postsByVisibility
    };
  }
};
