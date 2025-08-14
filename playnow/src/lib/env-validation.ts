/**
 * Environment variable validation
 * This ensures all required environment variables are set at startup
 */

type EnvConfig = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALLOWED_ORIGINS?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  ALLOWED_IMAGE_DOMAINS?: string;
  ALLOWED_REDIRECT_DOMAINS?: string;
  HERE_API_KEY?: string; // server-side only
  GOOGLE_MAPS_API_KEY?: string; // server-side only for Places
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?: string; // browser-restricted key for Place Photos URLs
};

class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

export function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // Required variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  // Validate URL format
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    } catch {
      errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
    }
  }

  // Validate allowed origins format
  if (process.env.ALLOWED_ORIGINS) {
    const origins = process.env.ALLOWED_ORIGINS.split(',');
    origins.forEach(origin => {
      try {
        new URL(origin);
      } catch {
        errors.push(`Invalid origin in ALLOWED_ORIGINS: ${origin}`);
      }
    });
  }

  // Validate allowed image domains
  if (process.env.ALLOWED_IMAGE_DOMAINS) {
    const domains = process.env.ALLOWED_IMAGE_DOMAINS.split(',');
    domains.forEach(domain => {
      if (!domain || domain.includes('/')) {
        errors.push(`Invalid domain in ALLOWED_IMAGE_DOMAINS: ${domain}`);
      }
    });
  }

  // Validate allowed redirect domains
  if (process.env.ALLOWED_REDIRECT_DOMAINS) {
    const domains = process.env.ALLOWED_REDIRECT_DOMAINS.split(',');
    domains.forEach(domain => {
      if (!domain || domain.includes('/')) {
        errors.push(`Invalid domain in ALLOWED_REDIRECT_DOMAINS: ${domain}`);
      }
    });
  }

  // HERE API key is optional; warn in development if missing when related endpoints are used
  if (process.env.NODE_ENV !== 'production' && !process.env.HERE_API_KEY) {
    // no-op: optional feature; just a soft warning in dev logs
  }

  if (errors.length > 0) {
    throw new EnvValidationError(
      `Environment validation failed:\n${errors.join('\n')}`
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    ALLOWED_IMAGE_DOMAINS: process.env.ALLOWED_IMAGE_DOMAINS,
    ALLOWED_REDIRECT_DOMAINS: process.env.ALLOWED_REDIRECT_DOMAINS,
    HERE_API_KEY: process.env.HERE_API_KEY,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
  };
}

// Validate environment variables at module load time
// This will cause the application to fail fast if configuration is invalid
if (typeof window === 'undefined') {
  try {
    validateEnv();
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      // In production, fail fast
      console.error('FATAL: Environment validation failed');
      console.error(error);
      process.exit(1);
    } else {
      // In development, warn but continue
      console.warn('Warning: Environment validation failed');
      console.warn(error);
    }
  }
}
