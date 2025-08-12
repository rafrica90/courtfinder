import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Validate and sanitize redirect URLs to prevent open redirect attacks
function isValidRedirectUrl(url: string): boolean {
  try {
    const redirectUrl = new URL(url);
    
    // For venue booking URLs, we allow any HTTPS URL from trusted venue booking sites
    // These are external booking platforms that venues use
    const trustedBookingDomains = [
      'cityofsydney.nsw.gov.au',
      'tennis.com.au',
      'picklepoint.com.au',
      'playpickle.com.au',
      'northsydneytennis.com.au',
      'whitecitytennis.com.au',
      'parklandssports.com.au',
      'lyneparktennis.com.au',
      'bookable.net.au',
      'tennisvenues.com.au',
      'tennisworld.net.au',
      'kikoff.com.au',
      'ultimatesoccer.com.au',
      'sydneyolympicpark.com.au',
      'footballnsw.com.au',
      'clubmarconi.com.au',
      'intrinsicsports.com.au',
      'fdlc.com.au',
      'mosmanlawntennis.com.au',
      'burwood.nsw.gov.au',
      'cpsports.com.au',
      'birchgrovetennis.com.au',
      'haberfieldtennis.com.au',
      'strathfieldsportsclub.com.au',
      'southendtenniscentre.com.au',
      'swtctennis.com.au',
      'croydontenniscentre.com.au',
      'wakehursttennis.com.au',
      'ryde.nsw.gov.au',
      'blacktown.nsw.gov.au',
      'liverpool.nsw.gov.au',
      'camden.nsw.gov.au',
      'bayside.nsw.gov.au',
      'canterbury-bankstown.nsw.gov.au',
      'innerwest.nsw.gov.au',
      'northernbeaches.nsw.gov.au',
      'waverley.nsw.gov.au',
      'pcycnsw.org.au',
      'canadabay.nsw.gov.au',
      'thejar.com.au',
      'cityofparramatta.nsw.gov.au',
      'thehills.nsw.gov.au',
      'georgesriver.nsw.gov.au',
      'bankstown.nsw.gov.au',
      'uts.edu.au',
      'citycommunitytennis.com.au'
    ];
    
    // Get allowed internal domains from environment variable  
    const allowedInternalDomains = process.env.ALLOWED_REDIRECT_DOMAINS?.split(',') || [
      'localhost:3000',
      'localhost:3001',
      'courtfinder.app',
      'playnow.app'
    ];
    
    const hostname = redirectUrl.hostname;
    
    // Check if it's an internal domain
    const isInternalDomain = allowedInternalDomains.some(domain => {
      // Support wildcard subdomains
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2);
        return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
      }
      return hostname === domain || hostname.includes(domain);
    });
    
    // Check if it's a trusted booking domain
    const isTrustedBookingDomain = trustedBookingDomains.some(domain => 
      hostname === domain || 
      hostname.endsWith(`.${domain}`) || 
      hostname === `www.${domain}`
    );
    
    // Only allow HTTPS in production (allow HTTP for localhost in dev)
    const isSecureProtocol = 
      redirectUrl.protocol === 'https:' || 
      (process.env.NODE_ENV !== 'production' && hostname.includes('localhost'));
    
    return (isInternalDomain || isTrustedBookingDomain) && isSecureProtocol;
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
