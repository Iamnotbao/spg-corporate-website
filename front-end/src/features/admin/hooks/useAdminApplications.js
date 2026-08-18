import { useCallback, useEffect, useState } from 'react';
import { listAdminApplications } from '../../../services/adminService.js';
import { getErrorMessage } from '../utils.js';
import { useDebouncedValue } from './useDebouncedValue.js';

const PAGE_SIZE = 10;
const EMPTY_PAGINATION = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

export function useAdminApplications(onUnauthorized) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    listAdminApplications({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch.trim(),
      signal: controller.signal,
    })
      .then((result) => {
        const nextPagination = {
          page: Math.max(1, Number(result?.pagination?.page) || page),
          pageSize: Math.max(1, Number(result?.pagination?.pageSize)) || PAGE_SIZE,
          total: Math.max(0, Number(result?.pagination?.total) || 0),
          totalPages: Math.max(1, Number(result?.pagination?.totalPages) || 1),
        };

        if (page > nextPagination.totalPages) {
          setPage(nextPagination.totalPages);
          return;
        }

        setItems(Array.isArray(result?.data) ? result.data : []);
        setPagination(nextPagination);
      })
      .catch((requestError) => {
        if (requestError?.name === 'AbortError') return;
        if (onUnauthorized?.(requestError)) return;
        setError(getErrorMessage(requestError, 'Không thể tải hồ sơ ứng tuyển.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedSearch, onUnauthorized, page, refreshKey]);

  const updateSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  return {
    items,
    search,
    searchPending: search !== debouncedSearch,
    page,
    pagination,
    loading,
    error,
    setPage,
    updateSearch,
    refresh,
  };
}
