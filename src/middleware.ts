import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith('/admin')) return next();
  if (context.url.pathname === '/admin/login') return next();

  const flag = context.cookies.get('app_admin')?.value;
  if (flag === '1') return next();

  return context.redirect('/admin/login');
});
