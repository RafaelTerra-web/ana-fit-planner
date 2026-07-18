/* global fetch, process */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function getSupabaseConfig() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  return { url, anonKey };
}

function readAuthorizationHeader(headers) {
  if (typeof headers?.get === 'function') {
    return headers.get('authorization') || '';
  }

  return headers?.authorization || headers?.Authorization || '';
}

export async function authenticateSupabaseUser(headers) {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return {
      ok: false,
      statusCode: 503,
      error: 'Autenticação do servidor não configurada.',
    };
  }

  const authorization = readAuthorizationHeader(headers);
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return {
      ok: false,
      statusCode: 401,
      error: 'Sessão necessária.',
    };
  }

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: authorization,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        statusCode: 401,
        error: 'Sessão inválida ou expirada.',
      };
    }

    const user = await response.json();
    if (typeof user?.id !== 'string' || !user.id) {
      return {
        ok: false,
        statusCode: 401,
        error: 'Usuário inválido.',
      };
    }

    return { ok: true, user };
  } catch {
    return {
      ok: false,
      statusCode: 503,
      error: 'Não foi possível validar a sessão.',
    };
  }
}

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

export function authErrorResponse(auth) {
  return jsonResponse(auth.statusCode, { error: auth.error });
}
