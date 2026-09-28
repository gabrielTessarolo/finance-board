// Swagger UI servido a partir da CDN, lendo /v1/openapi.json
const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FinanceBoard API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/v1/openapi.json',
        dom_id: '#swagger-ui',
        persistAuthorization: true,
      });
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
