async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "ProTech <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("================ MOCK EMAIL ================");
    console.log(`From: ${fromEmail}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html}`);
    console.log("============================================");
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Failed to send email to ${to}:`, errText);
    }
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
}

export async function sendVerificationEmail({ email, url }: { email: string; url: string }) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Verify your email address</h2>
      <p>Hello,</p>
      <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Verify Email
        </a>
      </p>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>Best regards,<br/>ProTech Team</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Verify your email address",
    html,
  });
}

export async function sendResetPasswordEmail({ email, url }: { email: string; url: string }) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Reset your password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. You can do so by clicking the link below:</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>Best regards,<br/>ProTech Team</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Reset your password",
    html,
  });
}
