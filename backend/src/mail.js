import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT = 587, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO } = process.env;
const transport = SMTP_HOST
  ? nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT), secure: Number(SMTP_PORT) === 465, auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined })
  : null;

// Ne bloque jamais la réponse : une erreur d'e-mail est seulement journalisée.
export async function notify(subject, text) {
  if (!transport || !MAIL_TO) return console.log(`[mail désactivé] ${subject}\n${text}`);
  try { await transport.sendMail({ from: MAIL_FROM, to: MAIL_TO, subject, text }); }
  catch (e) { console.error('Échec envoi e-mail :', e.message); }
}
