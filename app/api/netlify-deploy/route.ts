import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { html, clientName } = await req.json();

  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "NETLIFY_API_TOKEN no está configurado en las variables de entorno." },
      { status: 500 }
    );
  }

  const slug = `propuesta-${clientName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Date.now()}`;

  // 1. Crear el site
  const siteRes = await fetch("https://api.netlify.com/api/v1/sites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: slug }),
  });

  if (!siteRes.ok) {
    const err = await siteRes.text();
    return NextResponse.json(
      { error: `No se pudo crear el site en Netlify: ${err}` },
      { status: 502 }
    );
  }

  const site = await siteRes.json();

  // 2. Crear deploy con hash del archivo
  const sha1 = createHash("sha1").update(html).digest("hex");

  const deployRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${site.id}/deploys`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: { "/index.html": sha1 } }),
    }
  );

  if (!deployRes.ok) {
    const err = await deployRes.text();
    return NextResponse.json(
      { error: `No se pudo crear el deploy: ${err}` },
      { status: 502 }
    );
  }

  const deploy = await deployRes.json();

  // 3. Subir el archivo HTML
  const uploadRes = await fetch(
    `https://api.netlify.com/api/v1/deploys/${deploy.id}/files/index.html`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/html;charset=UTF-8",
      },
      body: html,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json(
      { error: `No se pudo subir el HTML: ${err}` },
      { status: 502 }
    );
  }

  const url = `https://${site.subdomain}.netlify.app`;
  return NextResponse.json({ url });
}
