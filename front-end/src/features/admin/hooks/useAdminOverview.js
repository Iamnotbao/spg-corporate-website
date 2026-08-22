import { useCallback, useEffect, useState } from 'react';
import {
  getAdminLearningSummary,
  listAdminContent,
} from '../../../services/adminService.js';
import { BLOG_CATEGORIES } from '../../blog/constants.js';
import { getErrorMessage } from '../utils.js';

const EMPTY_DATA = { postCount: 0, recentPosts: [], learning: null };

export function useAdminOverview(onUnauthorized) {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    Promise.all([
      Promise.all(
        BLOG_CATEGORIES.map((category) =>
          listAdminContent('posts', {
            category: category.slug,
            page: 1,
            pageSize: 5,
            signal: controller.signal,
          }),
        ),
      ),
      getAdminLearningSummary({ signal: controller.signal }),
    ])
      .then(([responses, learningResponse]) => {
        const recentPosts = responses
          .flatMap((response) => (Array.isArray(response?.data) ? response.data : []))
          .filter(
            (post, index, posts) =>
              index ===
              posts.findIndex(
                (candidate) =>
                  String(candidate?._id?.$oid || candidate?._id || candidate?.id) ===
                  String(post?._id?.$oid || post?._id || post?.id),
              ),
          )
          .sort(
            (left, right) =>
              new Date(right.updatedAt || right.createdAt || 0) -
              new Date(left.updatedAt || left.createdAt || 0),
          )
          .slice(0, 5);
        setData({
          postCount: responses.reduce(
            (total, response) => total + (Number(response?.pagination?.total) || 0),
            0,
          ),
          recentPosts,
          learning: learningResponse.data,
        });
      })
      .catch((requestError) => {
        if (requestError?.name === 'AbortError') return;
        if (onUnauthorized?.(requestError)) return;
        setError(getErrorMessage(requestError, 'Không thể tải dữ liệu Dashboard.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [onUnauthorized, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  return { ...data, loading, error, refresh };
}
