import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface UsePaginatedDataOptions {
  table: string;
  select?: string;
  limit?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, any>;
  ilikeFilters?: Record<string, string>; // for quick search mapping column -> query
  inFilters?: Record<string, any[]>; // maps column -> array of valid values
  orFilters?: string; // example: "name.ilike.%search%,email.ilike.%search%"
}

export function usePaginatedData<T>(options: UsePaginatedDataOptions) {
  const { user } = useAuth();
  const { branchId: urlBranchId } = useParams<{ branchId: string }>();
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<Error | null>(null);

  const activeBranchId = urlBranchId || user?.branchId;

  // Use refs to keep track of previous fetch parameters to prevent infinite loops 
  // without dropping useful cached states.
  const isMounted = useRef(true);

  const fetchLimit = options.limit || 10;
  
  // Create stable signature for fetch request
  const fetchSignature = JSON.stringify({
    branchId: activeBranchId,
    table: options.table,
    select: options.select,
    page,
    limit: fetchLimit,
    orderBy: options.orderBy,
    filters: options.filters,
    ilikeFilters: options.ilikeFilters,
    inFilters: options.inFilters,
    orFilters: options.orFilters
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * fetchLimit;
      const isSuper = user.role === 'super';
      
      let query = supabase
        .from(options.table)
        .select(options.select || '*', { count: 'exact' });

      // Apply branch filtering
      if (!isSuper && activeBranchId) {
        query = query.eq('branch_id', activeBranchId);
      }

      // Apply exact matched filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== 'all') {
            query = query.eq(key, val);
          }
        });
      }

      // Apply IN filters (array matching)
      if (options.inFilters) {
        Object.entries(options.inFilters).forEach(([key, val]) => {
          if (val && Array.isArray(val)) {
            if (val.length > 0) {
              query = query.in(key, val);
            } else {
              // If the array is empty, it means "match nothing". We provide a dummy impossible UUID/string
              query = query.in(key, ['NOT_POSSIBLE_MATCH_EMPTY_ARRAY']);
            }
          }
        });
      }

      // Apply OR filters for search
      if (options.orFilters) {
        query = query.or(options.orFilters);
      }

      // Apply ilike filters — multiple columns OR'd together for search
      if (options.ilikeFilters) {
        const entries = Object.entries(options.ilikeFilters).filter(([, val]) => val && val.trim() !== '');
        if (entries.length > 0) {
          const orClause = entries.map(([col, val]) => `${col}.ilike.%${val}%`).join(',');
          query = query.or(orClause);
        }
      }

      // Ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: resData, count, error: fetchError } = await query.range(offset, offset + fetchLimit - 1);

      if (fetchError) throw fetchError;

      if (isMounted.current) {
        setData(resData as T[]);
        setTotalCount(count || 0);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err);
        console.error("Pagination Fetch Error:", err);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [fetchSignature, user, activeBranchId]); // Only re-fetch if signature or branch changes

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  // Method to manually refetch data without changing page
  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Expose immediate update for optimistic UI
  const setDataOptimistic = useCallback((updater: (prev: T[]) => T[]) => {
    setData((prev) => updater(prev));
  }, []);

  return {
    data,
    totalCount,
    isLoading,
    error,
    page,
    setPage,
    refetch,
    setDataOptimistic,
    limit: fetchLimit
  };
}

