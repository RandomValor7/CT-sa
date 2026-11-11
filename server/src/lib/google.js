export function crearGoogle(config) {
  const redirectUri = `${config.baseUrl}/login/google/callback`;
  let cliente = null;
  let OAuth2Client = null;

  async function obtener() {
    if (!OAuth2Client) ({ OAuth2Client } = await import('google-auth-library'));
    if (!cliente) cliente = new OAuth2Client(config.google.clientId, config.google.clientSecret, redirectUri);
    return cliente;
  }

  async function urlAutorizacion({ state, nonce }) {
    const c = await obtener();
    return c.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state,
      nonce,
      prompt: 'select_account',
    });
  }

  async function obtenerPerfil(codigo, nonceEsperado) {
    const c = await obtener();
    const { tokens } = await c.getToken(codigo);
    if (!tokens.id_token) throw new Error('Google no devolvió id_token');
    const ticket = await c.verifyIdToken({ idToken: tokens.id_token, audience: config.google.clientId });
    const datos = ticket.getPayload();
    if (!datos || datos.nonce !== nonceEsperado) throw new Error('nonce inválido');
    return datos;
  }

  return { urlAutorizacion, obtenerPerfil };
}
