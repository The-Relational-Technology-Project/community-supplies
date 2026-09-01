/** Shared HTML helpers for Request Board notification emails. */

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function emailShell(bodyHtml: string, footerHtml: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #4a3728;">
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #e5d4c1; margin: 30px 0;">
      <p style="color: #8b7355; font-size: 14px; line-height: 1.5;">${footerHtml}</p>
    </div>
  `;
}

export function ctaButton(url: string, label: string): string {
  return `
    <p style="margin: 24px 0;">
      <a href="${url}" style="background: #c17c4a; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
        ${escapeHtml(label)}
      </a>
    </p>
  `;
}

export function requestCardHtml(title: string, note: string | null, category: string | null): string {
  return `
    <div style="background: #f5ebe1; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #c17c4a;">
      <h3 style="margin-top: 0; color: #4a3728; font-size: 18px;">${escapeHtml(title)}</h3>
      ${category ? `<p style="margin: 4px 0; color: #8b7355; font-size: 14px;">${escapeHtml(category)}</p>` : ""}
      ${note ? `<p style="line-height: 1.6; color: #6b5a4a; margin: 8px 0;">${escapeHtml(note)}</p>` : ""}
    </div>
  `;
}

/** Sends one email per recipient, in small batches so Resend isn't hammered. */
export async function sendInBatches<T>(
  items: T[],
  batchSize: number,
  send: (item: T) => Promise<unknown>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const results = await Promise.allSettled(items.slice(i, i + batchSize).map(send));
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        console.error("email send failed", r.reason);
      }
    }
  }
  return { sent, failed };
}
