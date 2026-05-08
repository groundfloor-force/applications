// Email sending via Resend (https://resend.com)
// Set RESEND_API_KEY in .env.local to activate.
// The FROM address domain must be verified in your Resend account.
// While unverified, Resend allows sending from onboarding@resend.dev for testing.

const RESEND_API = 'https://api.resend.com/emails'
const FROM = process.env.RESEND_FROM ?? 'Ground Floor PM <onboarding@resend.dev>'

async function send(payload: {
  to: string[]
  subject: string
  html: string
}): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return // silently skip when not configured

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: FROM, ...payload }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('Resend error:', res.status, text)
  }
}

// ── Applicant confirmation ────────────────────────────────────────────────────

export async function sendConfirmationEmail(
  applicantEmail: string,
  firstName: string,
  token: string
): Promise<void> {
  const statusUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://yourapp.vercel.app'}/apply/status/${token}`

  await send({
    to: [applicantEmail],
    subject: 'Your Rental Application Has Been Received — Ground Floor PM',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #005EAD; padding: 24px 32px;">
          <img src="https://www.groundfloorpm.com/images/logo-long.png" alt="Ground Floor PM" style="height: 40px;" />
        </div>
        <div style="padding: 32px;">
          <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Application Received, ${firstName}!</h1>
          <p style="color: #555; margin-bottom: 24px;">
            Thank you for applying with Ground Floor Property Management. Your application has been
            sent to our leasing team and will be reviewed within 1–2 business days.
          </p>

          <div style="background: #e6f1f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="font-weight: 600; margin-bottom: 8px; color: #005EAD;">What happens next?</p>
            <ol style="margin: 0; padding-left: 20px; color: #004080; line-height: 1.8;">
              <li>Our team reviews your application</li>
              <li>We contact your previous landlord and references</li>
              <li>You'll be notified of our decision by email or phone</li>
              <li>If approved, you'll receive your lease agreement</li>
            </ol>
          </div>

          <a href="${statusUrl}" style="display: inline-block; background: #005EAD; color: white; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-weight: 600;">
            Check Application Status →
          </a>

          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            If you have questions, contact us at <a href="https://www.groundfloorpm.com" style="color: #005EAD;">groundfloorpm.com</a>
          </p>
        </div>
      </div>
    `,
  })
}

// ── Staff notification ────────────────────────────────────────────────────────

export async function sendNotificationEmail(
  notificationEmail: string,
  applicantName: string,
  propertyAddress: string,
  mondayItemUrl: string
): Promise<void> {
  if (!notificationEmail) return

  await send({
    to: [notificationEmail],
    subject: `New Application: ${applicantName} — ${propertyAddress || 'No property selected'}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #005EAD; padding: 24px 32px;">
          <img src="https://www.groundfloorpm.com/images/logo-long.png" alt="Ground Floor PM" style="height: 40px;" />
        </div>
        <div style="padding: 32px;">
          <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">New Rental Application</h1>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px 0; color: #555; width: 140px;">Applicant</td><td style="padding: 8px 0; font-weight: 600;">${applicantName}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Property</td><td style="padding: 8px 0; font-weight: 600;">${propertyAddress || '—'}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Submitted</td><td style="padding: 8px 0;">${new Date().toLocaleString('en-CA', { timeZone: 'America/Moncton' })}</td></tr>
          </table>
          <a href="${mondayItemUrl}" style="display: inline-block; background: #005EAD; color: white; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-weight: 600;">
            View in Monday.com →
          </a>
        </div>
      </div>
    `,
  })
}
