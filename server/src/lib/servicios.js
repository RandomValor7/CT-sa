import nodemailer from 'nodemailer';

export function crearCorreo(config, registro = console) {
  let transporte = null;

  function obtenerTransporte() {
    if (transporte) return transporte;
    transporte = nodemailer.createTransport({
      host: config.mail.servidor,
      port: config.mail.puerto,
      secure: config.mail.puerto === 465,
      requireTLS: config.mail.puerto !== 465,
      auth: { user: config.mail.usuario, pass: config.mail.clave },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    return transporte;
  }

  async function enviar(destino, asunto, cuerpo) {
    if (!config.mail.usuario || !config.mail.clave) {
      registro.info('Envío de correo omitido: MAIL_USERNAME/MAIL_PASSWORD no configurados en .env');
      return false;
    }
    try {
      await obtenerTransporte().sendMail({
        from: config.mail.usuario,
        to: destino,
        subject: asunto,
        text: cuerpo,
      });
      return true;
    } catch (err) {
      registro.error('No se pudo enviar el correo:', err.message);
      return false;
    }
  }

  function notificarEmpresa(asunto, cuerpo) {
    return enviar(config.empresa.email, asunto, cuerpo);
  }

  return { enviar, notificarEmpresa };
}

export function crearTurnstile(config, registro = console) {
  return async function verificar(token, ipRemota) {
    if (!config.turnstile.claveSecreta) return true;
    if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false;

    const datos = new URLSearchParams({ secret: config.turnstile.claveSecreta, response: token });
    if (ipRemota) datos.set('remoteip', ipRemota);

    try {
      const respuesta = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: datos,
        signal: AbortSignal.timeout(5000),
      });
      const resultado = await respuesta.json();
      return Boolean(resultado.success);
    } catch (err) {
      registro.error('No se pudo verificar el CAPTCHA de Turnstile:', err.message);
      return false;
    }
  };
}
