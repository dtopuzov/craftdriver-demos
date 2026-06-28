import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

type Options = RenderOptions & {
  router?: Pick<MemoryRouterProps, 'initialEntries' | 'initialIndex'>;
};

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { router, ...renderOptions } = options;
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter {...router}>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
    ...renderOptions,
  });
}
