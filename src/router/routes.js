const appRoutePattern = /^\/app\/(?<id>[^/]+)$/;

const routeDefinitions = [
  {
    test: (pathname) => (pathname === '/' ? {} : null),
    load: () => import('../pages/home.js'),
  },
  {
    test: (pathname) => (pathname === '/login' ? {} : null),
    load: () => import('../pages/login.js'),
  },
  {
    test: (pathname) => (pathname === '/dashboard' ? {} : null),
    load: () => import('../pages/dashboard.js'),
  },
  {
    test: (pathname) => {
      const match = pathname.match(appRoutePattern);
      return match ? { id: decodeURIComponent(match.groups.id) } : null;
    },
    load: () => import('../pages/app.js'),
  },
];

export function matchRoute(pathname) {
  const normalizedPath = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;

  for (const routeDefinition of routeDefinitions) {
    const params = routeDefinition.test(normalizedPath);

    if (params) {
      return {
        load: routeDefinition.load,
        params,
        path: normalizedPath,
      };
    }
  }

  return null;
}
