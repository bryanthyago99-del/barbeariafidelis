export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { data, horario, nome, whatsapp } = body || {};

    if (!data || !horario || !nome || !whatsapp) {
      return jsonResponse(400, { error: 'Dados incompletos' });
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM agendamentos WHERE data = ? AND horario = ? LIMIT 1'
    )
      .bind(data, horario)
      .first();

    if (existing) {
      return jsonResponse(409, { error: 'Horário já ocupado' });
    }

    const id = crypto.randomUUID();

    await env.DB.prepare(
      'INSERT INTO agendamentos (id, data, horario, nome, whatsapp) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(id, data, horario, nome, whatsapp)
      .run();

    return jsonResponse(200, { success: true, id });
  } catch (error) {
    const msg = error && error.message ? error.message : String(error);

    if (
      msg.includes('UNIQUE constraint failed') ||
      msg.includes('UNIQUE') ||
      error?.code === 'SQLITE_CONSTRAINT_UNIQUE'
    ) {
      return jsonResponse(409, { error: 'Horário já ocupado' });
    }

    return jsonResponse(500, { error: 'Erro ao agendar horário' });
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
