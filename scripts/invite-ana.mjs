import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ANA_EMAIL;
const redirectTo = process.env.SUPABASE_REDIRECT_URL;

const missing = [
  ['SUPABASE_URL', supabaseUrl],
  ['SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY)', secretKey],
  ['ANA_EMAIL', email],
  ['SUPABASE_REDIRECT_URL', redirectTo],
].filter(([, value]) => !value).map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Variáveis ausentes: ${missing.join(', ')}`);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo,
  data: {
    display_name: 'Ana',
    force_password_change: true,
  },
});

if (error) {
  throw error;
}

console.log(`Convite enviado com segurança para ${data.user.email}.`);
