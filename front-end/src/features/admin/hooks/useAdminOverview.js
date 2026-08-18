import { useCallback, useEffect, useState } from 'react';
import {
  listAdminApplications,
  listAdminContent,
} from '../../../services/adminService.js';
import { getErrorMessage } from '../utils.js';

const EMPTY_STATS = { posts: 0, jobs: 0, applications: 0 };

export function useAdminOverview(onUnauthorized) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    Promise.all([
      listAdminContent('posts', {
        page: 1,
        pageSize: 1,
        signal: controller.signal,
      }),
      listAdminContent('jobs', {
        page: 1,
        pageSize: 1,
        signal: controller.signal,
      }),
      listAdminApplications({
        page: 1,
        pageSize: 1,
        signal: controller.signal,
      }),
    ])
      .then(([posts, jobs, applications]) => {
        setStats({
          posts: Number(posts?.pagination?.total) || 0,
          jobs: Number(jobs?.pagination?.total) || 0,
          applications: Number(applications?.pagination?.total) || 0,
        });
      })
      .catch((requestError) => {
        if (requestError?.name === 'AbortError') return;
        if (onUnauthorized?.(requestError)) return;
        setError(getErrorMessage(requestError, 'Không thể tải dữ liệu tổng quan.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [onUnauthorized, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  return { stats, loading, error, refresh };
}
