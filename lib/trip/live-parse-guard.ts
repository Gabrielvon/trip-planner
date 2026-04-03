import { RouteContractError } from './contracts';

const DEFAULT_MAX_TEXT_CHARS = 12_000;
const DEFAULT_MAX_BODY_BYTES = 32 * 1024;
const DEFAULT_RATE_LIMIT = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

type ParseRateBucket = {
  count: number;
  resetAt: number;
};

const parseRateBuckets = new Map<string, ParseRateBucket>();

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || 'unknown';
}

export function getLiveParseMaxTextChars(): number {
  return readPositiveInt(process.env.TRIP_PARSE_MAX_CHARS, DEFAULT_MAX_TEXT_CHARS);
}

export function getLiveParseMaxBodyBytes(): number {
  return readPositiveInt(process.env.TRIP_PARSE_MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES);
}

export function isLiveParseEnabledForDeployment(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.TRIP_PUBLIC_LIVE_PARSE_ENABLED === 'true';
}

export function assertLiveParseDeploymentEnabled(): void {
  if (!isLiveParseEnabledForDeployment()) {
    throw new RouteContractError(
      'Live parse is disabled for this deployment. Enable TRIP_PUBLIC_LIVE_PARSE_ENABLED to expose it.',
      403,
    );
  }
}

export function assertLiveParseTextWithinLimit(text: string): void {
  const maxChars = getLiveParseMaxTextChars();
  if (text.length > maxChars) {
    throw new RouteContractError(`text must be at most ${maxChars} characters`, 413);
  }
}

export function assertLiveParseRateLimit(request: Request): void {
  const limit = readPositiveInt(process.env.TRIP_PARSE_RATE_LIMIT, DEFAULT_RATE_LIMIT);
  const windowMs = readPositiveInt(
    process.env.TRIP_PARSE_RATE_LIMIT_WINDOW_MS,
    DEFAULT_RATE_LIMIT_WINDOW_MS,
  );

  const now = Date.now();
  const clientKey = getClientKey(request);
  const bucket = parseRateBuckets.get(clientKey);

  if (!bucket || bucket.resetAt <= now) {
    parseRateBuckets.set(clientKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new RouteContractError(
      `Live parse rate limit exceeded. Retry in about ${retryAfterSeconds} seconds.`,
      429,
    );
  }

  bucket.count += 1;
}

export async function readJsonRequestBody(request: Request): Promise<unknown> {
  const maxBytes = getLiveParseMaxBodyBytes();
  const contentLength = request.headers.get('content-length');

  if (contentLength) {
    const parsedContentLength = Number.parseInt(contentLength, 10);
    if (Number.isFinite(parsedContentLength) && parsedContentLength > maxBytes) {
      throw new RouteContractError(`Request body must be at most ${maxBytes} bytes`, 413);
    }
  }

  const rawBody = await request.text();
  const rawBytes = new TextEncoder().encode(rawBody).length;

  if (rawBytes > maxBytes) {
    throw new RouteContractError(`Request body must be at most ${maxBytes} bytes`, 413);
  }

  if (!rawBody.trim()) {
    throw new RouteContractError('Request body must not be empty');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new RouteContractError('Request body must be valid JSON');
  }
}

export function __resetLiveParseRateLimitForTests(): void {
  parseRateBuckets.clear();
}
