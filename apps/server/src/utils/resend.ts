export async function sendEmail({
  to,
  subject,
  html,
  apiKey,
}: {
  to: string;
  subject: string;
  html: string;
  apiKey?: string;
}) {
  if (!apiKey) {
    console.log("================ MOCK EMAIL ================");
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
        from: "ProTech <onboarding@resend.dev>",
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
