const API = (p) => (typeof getWebAppBackendUrl === 'function'
  ? getWebAppBackendUrl(p.replace(/^\//,''))
  : p);
