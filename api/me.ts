// GET /api/me — current user + access status + progress.
// Auth: Bearer session token.
//
// Access is granted manually: a prospect contacts you, you send a payment
// link, and after they pay you flip entitlements.paid via /api/admin/access.
// `paid` here reflects that flag.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
import { cors, json } from './_lib/http.js';
import { getSessionUser } from './_lib/auth.js';

// Access requires entitlements.paid (set manually after payment).
const PAYWALL_ENABLED = true;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });

  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { error: 'unauthorized' });

  let paid = true;
  if (PAYWALL_ENABLED) {
    const ent = await sql`select paid from entitlements where user_id = ${user.id} limit 1`;
    paid = (ent[0] as { paid: boolean } | undefined)?.paid ?? false;
  }

  // Progress payload (populated in Phase 4). Empty-but-shaped for now.
  const progress = await loadProgress(user.id);

  return json(res, 200, {
    user: { id: user.id, email: user.email, nombre: user.nombre },
    paid,
    progress,
  });
}

async function loadProgress(userId: string) {
  const [modules, quizzes, exercises, goals] = await Promise.all([
    sql`select module_id, completed from course_progress where user_id = ${userId}`,
    sql`select question_id, selected_index, is_correct from quiz_answers where user_id = ${userId}`,
    sql`select exercise_id, kind, done, retries from exercise_submissions where user_id = ${userId}`,
    sql`select id, title, detail, target_date, status from goals where user_id = ${userId} order by created_at`,
  ]);
  return { modules, quizzes, exercises, goals };
}
