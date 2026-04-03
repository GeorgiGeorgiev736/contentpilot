const { Resend } = require("resend");

let resend = null;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}
const FROM   = "Autopilot <noreply@contentautopilot.up.railway.app>";
const FRONT  = process.env.FRONTEND_URL || "https://contentautopilot.up.railway.app";

async function sendVerificationEmail(email, name, token) {
  const link = `${FRONT}/verify-email?token=${token}`;
  await getResend().emails.send({
    from:    FROM,
    to:      email,
    subject: "Verify your Autopilot account",
    html: `
      <div style="font-family:'Segoe UI',sans-serif;background:#07071C;color:#E2E2F5;padding:40px 0;min-height:100vh">
        <div style="max-width:480px;margin:0 auto;background:#0F0F2A;border:1px solid #2A2A50;border-radius:18px;padding:40px 36px">
          <div style="text-align:center;margin-bottom:32px">
            <div style="width:64px;height:64px;border-radius:16px;background:#7C5CFC;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px">🚀</div>
            <h1 style="font-size:22px;font-weight:800;color:#F5F5FF;margin:0">Verify your email</h1>
            <p style="color:#7070A0;margin-top:8px;font-size:15px">Hi ${name}, one quick step to activate your account.</p>
          </div>
          <a href="${link}" style="display:block;text-align:center;background:linear-gradient(135deg,#7C5CFC,#B45AFD);color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px;margin-bottom:24px">
            Verify my account →
          </a>
          <p style="color:#5A5A88;font-size:13px;text-align:center;line-height:1.6">
            This link expires in 24 hours.<br/>
            If you didn't create an Autopilot account, ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };
