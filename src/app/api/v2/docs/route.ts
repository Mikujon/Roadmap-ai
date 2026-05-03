export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RoadmapAI API v2</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"/>
  <style>
    body { margin: 0; background: #F8F7F3; }
    .swagger-ui .topbar { background: #006D6B !important; }
    .swagger-ui .topbar-wrapper img { display: none; }
    .swagger-ui .topbar-wrapper::before {
      content: "RoadmapAI API v2";
      color: white; font-size: 18px; font-weight: 700; font-family: sans-serif;
    }
    .swagger-ui .btn.execute { background: #006D6B; border-color: #006D6B; }
    .swagger-ui .btn.execute:hover { background: #005555; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
