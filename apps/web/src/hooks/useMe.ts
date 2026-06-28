import { useQuery } from '@tanstack/react-query';
import type { CurrentUser } from '@exam/contracts';
import { api } from '../api.js';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: CurrentUser }>('/api/me'),
    retry: false,
  });
}
