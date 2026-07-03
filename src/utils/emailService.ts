/* ─────────────────────────────────────────────────────────────────────────
   emailService — client wrapper around the send-email edge function
   (Brevo relay). Fire-and-forget by design: transactional email must
   never block or break the UX, so every helper resolves to a boolean
   and swallows network errors after logging them.
   ───────────────────────────────────────────────────────────────────────── */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailInput): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return false;

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html, replyTo }),
    });
    if (!res.ok) {
      console.warn('[emailService] send failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[emailService] network error:', err);
    return false;
  }
}

/* Shared shell so every mail reads as the same brand. Inline styles
   only — email clients ignore stylesheets. */
function emailShell(title: string, bodyHtml: string): string {
  return `
  <div style="background:#f6f4fa;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <div style="font-size:18px;font-weight:800;color:#16141f;margin-bottom:4px;">Skinify</div>
      <h1 style="font-size:20px;font-weight:700;color:#16141f;margin:16px 0 8px;">${title}</h1>
      <div style="font-size:14px;line-height:1.6;color:#5a586e;">${bodyHtml}</div>
      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2dcea;font-size:11px;color:#8280a0;">
        Skinify s.r.o. · Grafická 3365/1, 150 00 Praha 5 · This is an automated message.
      </div>
    </div>
  </div>`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── Support ticket notifications ── */

export function sendTicketCreatedEmail(opts: {
  to: string;
  ticketSubject: string;
  ticketId: string;
}): Promise<boolean> {
  const subject = `Ticket received — ${opts.ticketSubject}`;
  const html = emailShell(
    'We got your ticket',
    `<p>Thanks for reaching out. Our support team has received your ticket
     <strong>&quot;${escapeHtml(opts.ticketSubject)}&quot;</strong> and will reply as soon as possible —
     usually within a few hours.</p>
     <p style="margin-top:12px;">You can follow the conversation any time at
     <a href="https://skinify.gg/tickets" style="color:#8b49f2;font-weight:700;">skinify.gg/tickets</a>.</p>
     <p style="margin-top:12px;font-size:12px;color:#8280a0;">Reference: ${escapeHtml(opts.ticketId)}</p>`,
  );
  return sendEmail({ to: opts.to, subject, html, replyTo: 'support@skinify.gg' });
}

export function sendTicketReplyEmail(opts: {
  to: string;
  ticketSubject: string;
  preview: string;
}): Promise<boolean> {
  const subject = `New reply — ${opts.ticketSubject}`;
  const html = emailShell(
    'Support replied to your ticket',
    `<p>There's a new reply on your ticket
     <strong>&quot;${escapeHtml(opts.ticketSubject)}&quot;</strong>:</p>
     <blockquote style="margin:12px 0;padding:12px 16px;background:#f6f4fa;border-radius:10px;color:#16141f;">
       ${escapeHtml(opts.preview).slice(0, 400)}
     </blockquote>
     <p><a href="https://skinify.gg/tickets" style="color:#8b49f2;font-weight:700;">Open the conversation →</a></p>`,
  );
  return sendEmail({ to: opts.to, subject, html, replyTo: 'support@skinify.gg' });
}
