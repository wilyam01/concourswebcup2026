export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function sendTransactionalEmail({ to, subject, text }) {
  if (!emailDeliveryConfigured()) throw new Error('EMAIL_DELIVERY_NOT_CONFIGURED');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to: [to], subject, text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`EMAIL_DELIVERY_FAILED_${response.status}`);
  return response.json().catch(() => ({}));
}
