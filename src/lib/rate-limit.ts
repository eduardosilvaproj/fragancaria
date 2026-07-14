// Rate limiter em memória (janela deslizante). Suficiente para uma instância
// única no Railway — é a primeira linha contra brute-force no login admin e
// abuso do rastreio de convidado. NÃO é distribuído: se um dia houver mais de
// uma instância, migrar para Redis/Upstash. Sem dependência externa.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Limpa buckets expirados de vez em quando para não vazar memória.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

// Consome 1 do orçamento de `key`. Retorna allowed=false quando o limite da
// janela foi excedido. `windowMs` é o tamanho da janela; `max` o teto.
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (b.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Zera o orçamento de uma chave (ex.: após login bem-sucedido).
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}
