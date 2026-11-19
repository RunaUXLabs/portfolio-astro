import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  // The static host serves index.html naturally; development requests use Astro's index route.
  if (/\/courses\/[^/]+\/index\.html$/.test(context.url.pathname)) {
    const target = new URL(context.url);
    target.pathname = target.pathname.slice(0, -'index.html'.length);
    return context.rewrite(target);
  }
  return next();
});
