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

const DEFAULT_BOT_NAME = "queue_college_bot";
const DEFAULT_APP_NAME = "queue";

function getConfiguredName(value: string | undefined, placeholder: string) {
  const name = value?.trim().replace(/^@/, "");
  return name && /^[a-z0-9_]+$/i.test(name) && name.toLowerCase() !== placeholder
    ? name
    : undefined;
}

function getMiniAppUrl(): URL {
  const appName = getConfiguredName(import.meta.env.VITE_TELEGRAM_APP_NAME, "your_app");

  for (const value of [import.meta.env.VITE_TMA_URL, import.meta.env.VITE_TELEGRAM_APP_URL]) {
    const rawUrl = value?.trim();
    if (!rawUrl) continue;

    try {
      const url = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
      if (url.origin !== "https://t.me" || url.username || url.password) continue;

      const match = /^\/([a-z0-9_]+)(?:\/([a-z0-9_]+))?\/?$/i.exec(url.pathname);
      if (!match) continue;

      const [, bot, app] = match;
      if (!getConfiguredName(bot, "your_bot") || (app && !getConfiguredName(app, "your_app"))) {
        continue;
      }

      if (!app) {
        const shortName = appName ?? (bot.toLowerCase() === DEFAULT_BOT_NAME ? DEFAULT_APP_NAME : null);
        if (shortName) url.pathname = `/${bot}/${shortName}`;
      }
      return url;
    } catch {
      // Try the next configured address.
    }
  }

  const bot = getConfiguredName(import.meta.env.VITE_TELEGRAM_BOT_USERNAME, "your_bot") ?? DEFAULT_BOT_NAME;
  const shortName = appName ?? (bot.toLowerCase() === DEFAULT_BOT_NAME ? DEFAULT_APP_NAME : null);
  const url = new URL(`https://t.me/${bot}`);
  if (shortName) url.pathname += `/${shortName}`;
  return url;
}

export function generateQueueDeepLink(subject: string): string {
  const url = getMiniAppUrl();
  url.searchParams.set("startapp", encodeQueueParam(subject));
  return url.toString();
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
    if (!document.execCommand("copy")) throw new Error("Clipboard copy failed");
  } finally {
    document.body.removeChild(textArea);
  }
  return link;
}

export interface QueueShareDetails {
  subject: string;
  subjectName: string;
  queueType?: string | null;
  isNew?: boolean;
}

export function getQueueShareMessage(queue: QueueShareDetails) {
  return {
    title: queue.isNew ? "Новая очередь!" : "Очередь",
    description: [queue.subjectName, queue.queueType].filter(Boolean).join(" • "),
    url: generateQueueDeepLink(queue.subject),
  };
}

export function shareQueueLink({ title, description, url }: ReturnType<typeof getQueueShareMessage>) {
  const shareUrl = new URL("https://t.me/share/url");
  shareUrl.searchParams.set("url", url);
  shareUrl.searchParams.set("text", `${title}\n${description}`);

  const app = tg();
  if (app?.openTelegramLink) {
    app.openTelegramLink(shareUrl.toString());
  } else {
    window.open(shareUrl.toString(), "_blank", "noopener,noreferrer");
  }
}
