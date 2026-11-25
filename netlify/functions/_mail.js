// Envío de emails con Brevo (plan gratis). Si faltan las variables, simplemente no envía.
module.exports = async (to, subject, html) => {
  const k = process.env.BREVO_API_KEY, from = process.env.MAIL_FROM;
  if (!k || !from || !to) return;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST',
      headers: { 'api-key': k, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: { name: 'softparade cells', email: from }, to: [{ email: to }], subject, htmlContent: html }) });
  } catch (_) {}
};
