async function serveAdminSpa(context) {
  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = '/';
  assetUrl.search = '';

  const assetResponse = await context.env.ASSETS.fetch(assetUrl);
  const response = new Response(assetResponse.body, assetResponse);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const onRequest = serveAdminSpa;
