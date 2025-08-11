import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Validate and sanitize redirect URLs to prevent open redirect attacks
function isValidRedirectUrl(url: string): boolean {
  try {
    const redirectUrl = new URL(url);
    
    // Get allowed domains from environment variable
    const allowedDomains = process.env.ALLOWED_REDIRECT_DOMAINS?.split(',') || [
      'localhost:3000',
      'courtfinder.app',
      'playnow.app'
    ];
    
    // Check if the redirect domain is in the allowed list
    const hostname = redirectUrl.hostname;
    const isAllowed = allowedDomains.some(domain => {
      // Support wildcard subdomains
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2);
        return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
      }
      return hostname === domain;
    });
    
    // Only allow HTTPS in production (allow HTTP for localhost in dev)
    const isSecureProtocol = 
      redirectUrl.protocol === 'https:' || 
      (process.env.NODE_ENV !== 'production' && redirectUrl.hostname === 'localhost');
    
    return isAllowed && isSecureProtocol;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const venueId = searchParams.get('venueId');
  const redirect = searchParams.get('redirect');

  if (!venueId || !redirect) {
    return NextResponse.json({ error: 'Missing venueId or redirect' }, { status: 400 });
  }

  // Validate redirect URL to prevent open redirect attacks
  if (!isValidRedirectUrl(redirect)) {
    return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 });
  }

  // Fire-and-forget insert; if no Supabase env, skip
  try {
    const supabase = getSupabaseServiceClient();
    if (supabase) {
      await supabase.from('clicks').insert({ venue_id: venueId });
    }
  } catch {
    // In production, we should log this to a monitoring service
    // For now, we silently fail to not break the redirect flow
  }

  return NextResponse.redirect(redirect);
}
