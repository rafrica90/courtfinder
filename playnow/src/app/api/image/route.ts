import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Domain allowlist for image proxying to prevent SSRF attacks
function isAllowedImageDomain(hostname: string): boolean {
  const allowedDomains = process.env.ALLOWED_IMAGE_DOMAINS?.split(',') || [
    // Common CDN and image hosting services
    'images.unsplash.com',
    'cdn.pixabay.com',
    'i.imgur.com',
    'res.cloudinary.com',
    'storage.googleapis.com',
    '*.supabase.co',
    '*.supabase.in',
    // Australian venue image domains
    'www.cityofsydney.nsw.gov.au',
    'www.innerwest.nsw.gov.au',
    'www.cbcity.nsw.gov.au',
    'www.thehills.nsw.gov.au',
    'www.footballnsw.com.au',
    'www.wakehursttennis.com.au',
    'www.whitecitytennis.com.au',
  ];

  return allowedDomains.some(domain => {
    if (domain.startsWith('*.')) {
      const baseDomain = domain.slice(2);
      return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
    }
    return hostname === domain;
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url");
    if (!target) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
    }

    // Check if the domain is allowed
    if (!isAllowedImageDomain(parsed.hostname)) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

    const upstream = await fetch(parsed.toString(), {
      // Avoid sending cookies; set a basic UA to improve compatibility
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        // Some hosts reject missing Accept header
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      cache: "no-store",
      // Don't forward credentials
      redirect: "follow",
    });

    // Helper to return an inline lightweight SVG placeholder so the UI never breaks
    const placeholder = (reason: string) => {
      const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">\n  <defs>\n    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">\n      <stop offset="0%" stop-color="#0a1628"/>\n      <stop offset="100%" stop-color="#1a3a5c"/>\n    </linearGradient>\n  </defs>\n  <rect width="800" height="600" fill="url(#g)"/>\n  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#00d9ff" font-size="24" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial">Image unavailable</text>\n</svg>`;
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
          "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
          "x-image-proxy-fallback": reason,
        },
      });
    };

    // If upstream fails, serve placeholder instead of 502 so UI remains clean
    if (!upstream.ok) {
      return placeholder(`upstream-${upstream.status}`);
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    // In rare cases some hosts respond with HTML or JSON error pages with 200.
    if (!/^image\//i.test(contentType)) {
      return placeholder("non-image-response");
    }

    const arrayBuffer = await upstream.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        // Cache on the CDN/browser for a short time
        "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    // Final safety: never surface a 500 to the UI for images
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='#0f2847'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#00d9ff' font-size='24' font-family='system-ui'>Image unavailable</text></svg>`;
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        "x-image-proxy-fallback": "exception",
      },
    });
  }
}


