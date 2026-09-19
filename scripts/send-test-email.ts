// Sends one sample job-alert email to check Brevo works.
// Usage: node --env-file=.env.local node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json scripts/send-test-email.ts you@example.com
import { renderEmail } from "@/lib/digest";

const to = process.argv[2];
if (!to) throw new Error("Pass the email address to send to");
const items = [
  { id: "demo1", title: "PLC & SCADA Trainee Engineer", company: "Indus Controls (Sample)", place: "Pune, Maharashtra", deadline: "2026-10-01", match: 83 },
  { id: "demo2", title: "Junior Robotics Engineer (ROS2)", company: "Botline Robotics (Sample)", place: "Bengaluru, Karnataka", match: 67 },
  { id: "demo3", title: "Embedded Firmware Intern (ESP32)", company: "Voltbyte Labs (Sample)", place: "Chennai, Tamil Nadu", match: 50 },
];
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const mail = renderEmail({ name: "there", items, siteUrl: site, siteName: "UR Future", unsubscribeUrl: `${site}/profile` });
async function main() {
const res = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: { "api-key": process.env.BREVO_API_KEY ?? "", "content-type": "application/json", accept: "application/json" },
  body: JSON.stringify({
    sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME },
    to: [{ email: to }],
    subject: `[TEST] ${mail.subject}`,
    htmlContent: mail.html,
    textContent: mail.text,
  }),
});
console.log(res.status, (await res.text()).slice(0, 300));
}
main();
