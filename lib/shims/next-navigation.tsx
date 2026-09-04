'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface NavigateOptions {
  scroll?: boolean;
}

export interface AppRouterInstance {
  back(): void;
  forward(): void;
  refresh(): void;
  push(href: string, options?: NavigateOptions): void;
  replace(href: string, options?: NavigateOptions): void;
  prefetch(href: string): void;
}

export function useRouter(): AppRouterInstance {
  return {
    push: useCallback((href: string) => {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }, []),
    replace: useCallback((href: string) => {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }, []),
    back: useCallback(() => {
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    }, []),
    forward: useCallback(() => {
      if (typeof window !== 'undefined') {
        window.history.forward();
      }
    }, []),
    refresh: useCallback(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, []),
    prefetch: useCallback((_href: string) => {}, []),
  };
}

export function usePathname(): string {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  useEffect(() => {
    const onLocationChange = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
    };
  }, []);

  return pathname;
}

export function useSearchParams(): URLSearchParams {
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });

  useEffect(() => {
    const onLocationChange = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
    };
  }, []);

  return searchParams;
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  
  // Detect /dashboard/clients/:id
  if (parts.length >= 3 && parts[0] === 'dashboard' && parts[1] === 'clients') {
    params.id = parts[2];
  }

  return params as T;
}

export function redirect(url: string): never {
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
  throw new Error(`REDIRECT:${url}`);
}

export function notFound(): never {
  throw new Error('NEXT_NOT_FOUND');
}
