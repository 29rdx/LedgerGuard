type LogLevel = 'info' | 'warn' | 'error' | 'security';

// Sensitive patterns for redaction
const REDACTION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /Bearer\s+([a-zA-Z0-9_\-\.]+)/gi, replacement: 'Bearer [REDACTED_TOKEN]' },
  { pattern: /Basic\s+([a-zA-Z0-9+/=]+)/gi, replacement: 'Basic [REDACTED_CREDENTIALS]' },
  { pattern: /"client_secret"\s*:\s*"[^"]+"/gi, replacement: '"client_secret": "[REDACTED]"' },
  { pattern: /"secret"\s*:\s*"[^"]+"/gi, replacement: '"secret": "[REDACTED]"' },
  { pattern: /"password"\s*:\s*"[^"]+"/gi, replacement: '"password": "[REDACTED]"' },
  { pattern: /"passwordHash"\s*:\s*"[^"]+"/gi, replacement: '"passwordHash": "[REDACTED]"' },
  { pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, replacement: '[REDACTED_PAN]' },
  { pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, replacement: '$1***@$2' },
];

export function redactSensitiveData(input: string | Record<string, unknown>): string {
  let str = typeof input === 'string' ? input : JSON.stringify(input);
  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    str = str.replace(pattern, replacement);
  }
  return str;
}

export const secureLogger = {
  info(message: string, context?: Record<string, unknown>) {
    const payload = {
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message: redactSensitiveData(message),
      context: context ? JSON.parse(redactSensitiveData(context)) : undefined,
    };
    console.log(JSON.stringify(payload));
  },

  warn(message: string, context?: Record<string, unknown>) {
    const payload = {
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message: redactSensitiveData(message),
      context: context ? JSON.parse(redactSensitiveData(context)) : undefined,
    };
    console.warn(JSON.stringify(payload));
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const errDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
    const payload = {
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message: redactSensitiveData(message),
      error: errDetails ? JSON.parse(redactSensitiveData(errDetails as Record<string, unknown>)) : undefined,
      context: context ? JSON.parse(redactSensitiveData(context)) : undefined,
    };
    console.error(JSON.stringify(payload));
  },

  security(action: string, details: Record<string, unknown>) {
    const payload = {
      level: 'SECURITY_AUDIT',
      timestamp: new Date().toISOString(),
      action,
      details: JSON.parse(redactSensitiveData(details)),
    };
    console.log(JSON.stringify(payload));
  },
};
