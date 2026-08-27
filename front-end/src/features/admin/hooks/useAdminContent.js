import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAdminContent } from '../../../services/adminService.js';
import { DEFAULT_FILTERS } from '../constants.js';
import { getErrorMessage } from '../utils.js';
import { useDebouncedValue } from './useDebouncedValue.js';

const EMPTY_PAGINATION = {
  page: 1,
  pageSize: DEFAULT_FILTERS.pageSize,
  total: 0,
  totalPages: 1,
};

export function useAdminContent(type, onUnauthorized) {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const requestOptions = useMemo(
    () => ({
      page,
      pageSize: filters.pageSize,
      search: debouncedSearch.trim(),
      published: filters.published,
      category: type === 'posts' ? filters.category : '',
      jobType: filters.jobType,
      location: filters.location.trim(),
      from: filters.from,
      to: filters.to,
    }),
    [
      debouncedSearch,
      filters.category,
      filters.jobType,
      filters.location,
      filters.from,
      filters.to,
      filters.pageSize,
      filters.published,
      page,
      type,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    listAdminContent(type, { ...requestOptions, signal: controller.signal })
      .then((result) => {
        const nextPagination = {
          page: Math.max(1, Number(result?.pagination?.page) || page),
          pageSize: Math.max(1, Number(result?.pagination?.pageSize)) || filters.pageSize,
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
        setError(getErrorMessage(requestError, 'Không thể tải danh sách nội dung.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters.pageSize, onUnauthorized, page, refreshKey, requestOptions, type]);

  const updateFilter = useCallback((name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  return {
    items,
    filters,
    page,
    pagination,
    loading,
    error,
    searchPending: filters.search !== debouncedSearch,
    setPage,
    updateFilter,
    clearFilters,
    refresh,
  };
}
