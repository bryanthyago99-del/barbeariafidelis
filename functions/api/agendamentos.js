export async function onRequestGet(context) {
  const { request, env } = context;
  const suppliedPassword = request.headers.get('x-admin-key');
  const adminPassword = env.ADMIN_PASSWORD || 'fidelis-admin';

  if (!suppliedPassword || suppliedPassword !== adminPassword) {
    return jsonResponse(401, { error: 'Não autorizado' });
  }

  try {
    const result = await env.DB.prepare(
      `SELECT id, data, horario, nome, whatsapp
       FROM agendamentos
       ORDER BY data ASC, horario ASC`
    ).all();

    return jsonResponse(200, {
      agendamentos: result.results || [],
    });
  } catch (error) {
    return jsonResponse(500, { error: 'Erro ao buscar agendamentos' });
  }
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
