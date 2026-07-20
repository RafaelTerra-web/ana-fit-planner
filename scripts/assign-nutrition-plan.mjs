import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { applyAssignedNutritionPreset, validateAssignedNutritionPreset } from './lib/assigned-nutrition-plan.mjs';

const args = process.argv.slice(2);
const validateOnly = args.includes('--validate-only');
const apply = args.includes('--apply');

function readArgument(name) {
  const equalsPrefix = `${name}=`;
  const equalsValue = args.find((argument) => argument.startsWith(equalsPrefix))?.slice(equalsPrefix.length);
  if (equalsValue !== undefined) return equalsValue;
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function normalizeEmail(value) {
  return value.trim().toLocaleLowerCase('en-US');
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function protectedDataSnapshot(data, goalsMayChange) {
  const mutableKeys = new Set(['assignedNutritionPlan', 'meals', 'profile']);
  if (goalsMayChange) mutableKeys.add('goals');
  const protectedTopLevel = Object.fromEntries(
    Object.entries(data).filter(([key]) => !mutableKeys.has(key))
  );
  const { profile } = data;
  const protectedProfile = isRecord(profile)
    ? Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'preferredFoods' && key !== 'avoidedFoods'))
    : profile;
  return { ...protectedTopLevel, profile: protectedProfile };
}

function markerFrom(plan, assignedAt) {
  return {
    assigned_nutrition_plan_id: plan.id,
    assigned_nutrition_plan_revision: plan.revision,
    assigned_nutrition_plan_assigned_at: assignedAt,
  };
}

function hasCurrentMarker(metadata, plan) {
  return (
    isRecord(metadata) &&
    metadata.assigned_nutrition_plan_id === plan.id &&
    metadata.assigned_nutrition_plan_revision === plan.revision &&
    typeof metadata.assigned_nutrition_plan_assigned_at === 'string'
  );
}

const planFile = readArgument('--plan-file');
if (!planFile) {
  throw new Error('Informe um preset local não versionado com --plan-file.');
}
const preset = JSON.parse(await readFile(resolve(planFile), 'utf8'));
const validation = validateAssignedNutritionPreset(preset);

if (validateOnly) {
  const targetSummary = validation.totals
    ? `${validation.totals.calories} kcal, ${validation.totals.protein} g de proteína`
    : 'porções flexíveis, sem metas numéricas';
  console.log(`Preset ${preset.plan.id} validado: ${validation.mealCount} refeições, ${targetSummary}.`);
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = normalizeEmail(readArgument('--email') ?? process.env.TARGET_EMAIL ?? '');
const expectedUserId = readArgument('--expect-user-id');
const expectedUpdatedAt = readArgument('--expect-updated-at');
const expectedProtectedHash = readArgument('--expect-protected-hash');
const expectedMetadataHash = readArgument('--expect-metadata-hash');
const missing = [
  ['SUPABASE_URL', supabaseUrl],
  ['SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY)', secretKey],
  ['--email ou TARGET_EMAIL', email],
].filter(([, value]) => !value).map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Configuração ausente: ${missing.join(', ')}.`);
}
if (apply && (!expectedUserId || !expectedUpdatedAt || !expectedProtectedHash || !expectedMetadataHash)) {
  throw new Error('Para aplicar, informe os quatro valores do dry-run: --expect-user-id, --expect-updated-at, --expect-protected-hash e --expect-metadata-hash.');
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: profileRows, error: profileError } = await supabase
  .from('anfit_profiles')
  .select('user_id,email,display_name')
  .eq('email', email)
  .limit(2);

if (profileError) throw profileError;
if (profileRows.length !== 1) {
  throw new Error(`Esperava exatamente um perfil para o e-mail informado; encontrei ${profileRows.length}.`);
}
const profile = profileRows[0];
const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(profile.user_id);
if (authError) throw authError;
const authUser = authResult.user;
if (!authUser || normalizeEmail(authUser.email ?? '') !== email) {
  throw new Error('O e-mail da conta Auth não corresponde ao perfil; nenhuma alteração foi feita.');
}

if (apply && authUser.id !== expectedUserId) {
  throw new Error('O ID resolvido pelo e-mail não corresponde ao ID confirmado no dry-run. Nenhuma alteração foi feita.');
}

const { data: appRow, error: dataError } = await supabase
  .from('anfit_user_app_data')
  .select('data,updated_at')
  .eq('user_id', authUser.id)
  .maybeSingle();

if (dataError) throw dataError;
if (!appRow || !isRecord(appRow.data)) {
  throw new Error('A conta não possui um blob AppData completo. O script não cria nem substitui uma linha ausente.');
}

const currentMetadata = isRecord(authUser.app_metadata) ? authUser.app_metadata : {};
const existingPlan = isRecord(appRow.data.assignedNutritionPlan) ? appRow.data.assignedNutritionPlan : undefined;
const assignedAt = hasCurrentMarker(currentMetadata, preset.plan)
  ? currentMetadata.assigned_nutrition_plan_assigned_at
  : existingPlan?.id === preset.plan.id && existingPlan?.revision === preset.plan.revision && typeof existingPlan.assignedAt === 'string'
    ? existingPlan.assignedAt
    : new Date().toISOString();
const nextMetadata = { ...currentMetadata, ...markerFrom(preset.plan, assignedAt) };
const nextData = applyAssignedNutritionPreset(appRow.data, preset, assignedAt);
const goalsMayChange = preset.goals !== undefined;
const currentProtected = protectedDataSnapshot(appRow.data, goalsMayChange);
const nextProtected = protectedDataSnapshot(nextData, goalsMayChange);
const protectedHash = fingerprint(currentProtected);
const metadataHash = fingerprint(currentMetadata);

if (!isDeepStrictEqual(currentProtected, nextProtected)) {
  throw new Error('A preparação alteraria treino, progresso, rank ou outro dado fora da dieta. Nenhuma alteração foi feita.');
}

const dataAlreadyCurrent = isDeepStrictEqual(appRow.data, nextData);
const metadataAlreadyCurrent = isDeepStrictEqual(currentMetadata, nextMetadata);
console.log(`Conta confirmada: ${profile.display_name} <${email}>`);
console.log(`User ID: ${authUser.id}`);
console.log(`updated_at atual: ${appRow.updated_at}`);
console.log(`Hash protegido: ${protectedHash}`);
console.log(`Hash dos app_metadata: ${metadataHash}`);
console.log(`Plano alvo: ${preset.plan.id} (revisão ${preset.plan.revision})`);
if (preset.goals) {
  console.log(`Metas: ${preset.goals.calories} kcal, ${preset.goals.protein} g proteína, ${preset.goals.fat} g gordura, ${preset.goals.waterLiters} L água`);
} else {
  console.log('Metas numéricas: preservadas do AppData atual.');
}
console.log(`Refeições: ${preset.meals.map((meal) => meal.id).join(', ')}`);

if (dataAlreadyCurrent && metadataAlreadyCurrent) {
  console.log('A dieta e o marcador autoritativo já estão na revisão esperada; nenhuma gravação é necessária.');
  process.exit(0);
}
if (!apply) {
  console.log('Dry-run concluído: nenhuma alteração foi feita.');
  console.log('Para aplicar, repita com --apply e confirme user ID, updated_at, hash protegido e hash dos app_metadata exibidos acima.');
  process.exit(0);
}
if (appRow.updated_at !== expectedUpdatedAt || protectedHash !== expectedProtectedHash || metadataHash !== expectedMetadataHash) {
  throw new Error('A conta ou o blob não correspondem à versão revisada no dry-run. Rode o dry-run novamente; nenhuma alteração foi feita.');
}

const { data: freshAuthResult, error: freshAuthError } = await supabase.auth.admin.getUserById(authUser.id);
if (freshAuthError) throw freshAuthError;
if (!freshAuthResult.user || fingerprint(freshAuthResult.user.app_metadata ?? {}) !== metadataHash) {
  throw new Error('Os app_metadata da conta mudaram após o dry-run. Nenhuma alteração foi feita.');
}

if (!metadataAlreadyCurrent) {
  const { data: metadataResult, error: metadataError } = await supabase.auth.admin.updateUserById(authUser.id, {
    app_metadata: nextMetadata,
  });
  if (metadataError) throw metadataError;
  if (!metadataResult.user || !isDeepStrictEqual(metadataResult.user.app_metadata, nextMetadata)) {
    throw new Error('Não foi possível verificar o marcador autoritativo da dieta; o blob ainda não foi alterado.');
  }
  console.log('Marcador autoritativo gravado e verificado nos app_metadata da conta.');
}

async function rollbackMetadataAfterBlobConflict(reason) {
  if (metadataAlreadyCurrent) {
    throw reason;
  }

  const { data: currentAuthResult, error: currentAuthError } = await supabase.auth.admin.getUserById(authUser.id);
  if (currentAuthError) {
    throw new Error(
      `A gravação do blob falhou e não foi possível verificar o marcador antes da reversão: ${currentAuthError.message}`,
      { cause: reason },
    );
  }
  if (!currentAuthResult.user || !isDeepStrictEqual(currentAuthResult.user.app_metadata, nextMetadata)) {
    throw new Error(
      'A gravação do blob falhou e os app_metadata mudaram em paralelo. O script não os sobrescreveu; revise a conta antes de tentar novamente.',
      { cause: reason },
    );
  }

  const { data: rollbackResult, error: rollbackError } = await supabase.auth.admin.updateUserById(authUser.id, {
    app_metadata: currentMetadata,
  });
  if (rollbackError || !rollbackResult.user) {
    throw new Error(
      `A gravação do blob falhou e a reversão do marcador também falhou: ${rollbackError?.message ?? 'resposta sem usuário'}. Revise a conta manualmente.`,
      { cause: reason },
    );
  }

  const { data: verifiedRollbackResult, error: verifiedRollbackError } = await supabase.auth.admin.getUserById(authUser.id);
  if (
    verifiedRollbackError ||
    !verifiedRollbackResult.user ||
    !isDeepStrictEqual(verifiedRollbackResult.user.app_metadata, currentMetadata)
  ) {
    throw new Error(
      `A gravação do blob falhou e não foi possível confirmar a reversão do marcador: ${verifiedRollbackError?.message ?? 'metadata divergente'}. Revise a conta manualmente.`,
      { cause: reason },
    );
  }

  throw new Error(
    `${reason instanceof Error ? reason.message : String(reason)} O marcador autoritativo foi revertido e verificado; rode o dry-run novamente.`,
    { cause: reason },
  );
}

if (!dataAlreadyCurrent) {
  const { data: updatedRow, error: updateError } = await supabase
    .from('anfit_user_app_data')
    .update({ data: nextData })
    .eq('user_id', authUser.id)
    .eq('updated_at', appRow.updated_at)
    .select('data,updated_at')
    .maybeSingle();

  if (updateError) {
    await rollbackMetadataAfterBlobConflict(updateError);
  }
  if (!updatedRow || !isRecord(updatedRow.data)) {
    await rollbackMetadataAfterBlobConflict(
      new Error('O blob mudou durante a aplicação e a atualização foi cancelada por controle de concorrência.'),
    );
  }
  if (!isDeepStrictEqual(currentProtected, protectedDataSnapshot(updatedRow.data, goalsMayChange))) {
    throw new Error('A verificação pós-gravação encontrou divergência fora da dieta.');
  }
  if (!isDeepStrictEqual(nextData, updatedRow.data)) {
    throw new Error('A verificação pós-gravação não encontrou exatamente o plano esperado.');
  }
  console.log(`Blob da dieta aplicado e verificado. Novo updated_at: ${updatedRow.updated_at}`);
}

console.log('A atribuição do plano foi concluída sem substituir treino, progresso, rank ou histórico diário.');
