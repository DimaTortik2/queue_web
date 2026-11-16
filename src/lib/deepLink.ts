import { tg } from "./telegram";

/**
 * Encode string to base64url (RFC 4648 §5 without padding)
 */
export function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decode base64url string back to UTF-8
 */
export function fromBase64Url(str: string): string | null {
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * 32-bit FNV-1a hash formatted in base36 (at most 7 characters)
 */
export function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Encodes a queue subject identifier into a Telegram-safe start_param.
 * Telegram limits startapp to [A-Za-z0-9_-] and at most 64 characters.
 */
export function encodeQueueParam(subject: string): string {
  const b64 = toBase64Url(subject);
  // 'b_' prefix + b64 <= 64 chars
  if (b64.length <= 62) {
    return `b_${b64}`;
  }
  // Fallback to FNV-1a hash if subject is too long to fit in 64 chars
  return `h_${fnv1a(subject)}`;
}

/**
 * Resolves a start parameter back to the queue subject.
 * Returns null if the param is a hash that cannot be resolved yet
 * (e.g. while the queues list is still loading).
 */
export function resolveQueueSubject(
  param: string | null | undefined,
  queues?: { subject: string; subject_name?: string }[]
): string | null {
  if (!param) return null;

  // 1. Base64url encoded: 'b_<base64url>'
  if (param.startsWith("b_")) {
    const decoded = fromBase64Url(param.slice(2));
    if (decoded) return decoded;
  }

  // 2. Safe ASCII string: 's_<subject>'
  if (param.startsWith("s_")) {
    return param.slice(2);
  }

  // 3. FNV-1a Hash: 'h_<hash>'
  if (param.startsWith("h_")) {
    const targetHash = param.slice(2);
    if (queues && queues.length > 0) {
      const match = queues.find((q) => fnv1a(q.subject) === targetHash);
      if (match) return match.subject;
    }
    return null;
  }

  // 4. Legacy or generic: 'q_<payload>'
  if (param.startsWith("q_")) {
    const payload = param.slice(2);
    const decoded = fromBase64Url(payload);
    if (decoded) return decoded;
    return payload;
  }

  // 5. Raw subject match
  if (queues && queues.length > 0) {
    const exact = queues.find(
      (q) => q.subject === param || q.subject_name === param
    );
    if (exact) return exact.subject;
  }

  return param;
}

/**
 * Generates a shareable direct link to a queue.
 * Prioritizes direct Telegram Mini App (TMA) link formats:
 * 1. VITE_TMA_URL (e.g. https://t.me/queue_college_bot or https://t.me/queue_college_bot/app)
 * 2. VITE_TELEGRAM_BOT_USERNAME (+ optional VITE_TELEGRAM_APP_NAME)
 * 3. Default fallback to https://t.me/queue_college_bot?startapp=...
 */
export function generateQueueDeepLink(subject: string): string {
  const param = encodeQueueParam(subject);

  // 1. Direct TMA URL from env (e.g. "https://t.me/queue_college_bot" or "https://t.me/queue_college_bot/app")
  const rawTmaUrl = (
    import.meta.env.VITE_TMA_URL ||
    import.meta.env.VITE_TELEGRAM_APP_URL ||
    ""
  ).trim();

  if (rawTmaUrl) {
    try {
      const url = new URL(
        rawTmaUrl.startsWith("http") ? rawTmaUrl : `https://${rawTmaUrl}`
      );
      url.searchParams.set("startapp", param);
      return url.toString();
    } catch {
      const sep = rawTmaUrl.includes("?") ? "&" : "?";
      return `${rawTmaUrl}${sep}startapp=${param}`;
    }
  }

  // 2. Bot username + optional App short name (default to "queue_college_bot")
  const botUsername = (
    import.meta.env.VITE_TELEGRAM_BOT_USERNAME ||
    "queue_college_bot"
  )
    .trim()
    .replace(/^@/, "");
  const appName = (import.meta.env.VITE_TELEGRAM_APP_NAME || "").trim();

  if (botUsername) {
    if (appName) {
      return `https://t.me/${botUsername}/${appName}?startapp=${param}`;
    }
    return `https://t.me/${botUsername}?startapp=${param}`;
  }

  // 3. Web fallback
  try {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const url = new URL(pathname, origin);
    url.searchParams.set("queue", subject);
    return url.toString();
  } catch {
    return `?queue=${encodeURIComponent(subject)}`;
  }
}

/**
 * Copies the queue deep link to clipboard.
 */
export async function copyQueueLink(subject: string): Promise<string> {
  const link = generateQueueDeepLink(subject);
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(link);
    return link;
  }

  // Fallback for older WebViews without clipboard permission
  const textArea = document.createElement("textarea");
  textArea.value = link;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }
  return link;
}

/**
 * Shares the queue link via native Telegram share or Web Share API.
 */
export async function shareQueueLink(
  subject: string,
  title?: string
): Promise<void> {
  const link = generateQueueDeepLink(subject);
  const shareText = title ? `Очередь: ${title}` : "Очередь";

  const app = tg();
  if (app && typeof app.openTelegramLink === "function") {
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      link
    )}&text=${encodeURIComponent(shareText)}`;
    app.openTelegramLink(tgShareUrl);
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareText,
        text: shareText,
        url: link,
      });
      return;
    } catch {
      // Aborted or cancelled
    }
  }

  await copyQueueLink(subject);
}
