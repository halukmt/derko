const querystring = require('querystring');
const nodemailer = require('nodemailer');

// Expected env vars (set in Netlify UI):
// SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"/"false"), SMTP_USER, SMTP_PASS
// TO_EMAIL, FROM_EMAIL

function sanitizeHeader(value) {
  return String(value || '').replace(/[\r\n]/g, ' ').slice(0, 2000);
}

function buildSubject(topic, name, reqId) {
  const subject = `${topic} - ${name} - Anfrage-ID: ${reqId}`;
  return subject;
}

function buildRequestId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}${pad(d.getMonth()+1)}${String(d.getFullYear()).slice(-2)}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function buildBody(fields) {
  const lines = [];
  for (const [key, val] of Object.entries(fields)) {
    if (val) lines.push(`${key}: ${val}`);
  }
  return lines.join('\n');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  let data = {};
  if (contentType.includes('application/x-www-form-urlencoded')) {
    data = querystring.parse(event.body || '');
  } else if (contentType.includes('application/json')) {
    try { data = JSON.parse(event.body || '{}'); } catch { data = {}; }
  } else {
    return { statusCode: 400, body: 'Unsupported Content-Type' };
  }

  const required = ['name', 'email', 'phone', 'topic', 'message', 'privacy'];
  for (const k of required) {
    if (!data[k]) return { statusCode: 400, body: `Missing field: ${k}` };
  }

  // Booking-only fields required if topic=booking
  if (data.topic === 'booking') {
    for (const k of ['date_from', 'date_to', 'apartment', 'persons']) {
      if (!data[k]) return { statusCode: 400, body: `Missing field: ${k}` };
    }
  }

  const name = sanitizeHeader(data.name);
  const email = sanitizeHeader(data.email);
  const topic = sanitizeHeader(data.topic);

  const reqId = buildRequestId();
  const subject = buildSubject(topic, name, reqId);

  const operatorFields = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    topic: data.topic,
    date_from: data.date_from,
    date_to: data.date_to,
    apartment: data.apartment,
    persons: data.persons,
    message: data.message,
    privacy: data.privacy ? 'yes' : 'no'
  };

  const bodyForOperator = buildBody(operatorFields);

  const bodyForUser = [
    'Vielen Dank für Ihre Anfrage. Nachfolgend finden Sie Ihre Angaben:',
    '',
    bodyForOperator
  ].join('\n');

  // Configure transporter
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const TO = process.env.TO_EMAIL || 'social@techsulting.de';
  const FROM = process.env.FROM_EMAIL || 'kontakt@derko-immobilien.de';

  const transporter = nodemailer.createTransport({
    host, port, secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  try {
    // Operator mail
    await transporter.sendMail({
      from: FROM,
      to: TO,
      replyTo: email,
      subject,
      text: bodyForOperator,
    });

    // Confirmation to user
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject,
      text: bodyForUser,
    });

    // Redirect to confirmation page
    return {
      statusCode: 303,
      headers: { Location: '/pages/bestaetigung.html' },
      body: ''
    };
  } catch (err) {
    console.error('sendmail error', err);
    return { statusCode: 500, body: 'Mail sending failed' };
  }
};
