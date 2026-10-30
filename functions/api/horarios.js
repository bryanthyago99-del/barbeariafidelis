export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const data = url.searchParams.get('data');

    if (!data) {
      return jsonResponse(400, { error: 'Parâmetro data é obrigatório' });
    }

    const result = await env.DB.prepare(
      'SELECT horario FROM agendamentos WHERE data = ?'
    )
      .bind(data)
      .all();

    const ocupados = (result.results || []).map((item) => item.horario);

    return jsonResponse(200, { ocupados });
  } catch (error) {
    return jsonResponse(500, { error: 'Erro ao consultar horários' });
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
