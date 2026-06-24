// GET /api/me — current user + paywall status + progress.
// Auth: Bearer session token.
//
// Phase 2: `paid` is forced true (course is free until the Stripe paywall
// ships in Phase 3, where this flips to entitlements.paid). Progress is empty
// until Phase 4 wires the writes; the shape is stable from here.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
import { cors, json } from './_lib/http.js';
import { getSessionUser } from './_lib/auth.js';

// Flip to false when Phase 3 lands so the gate enforces payment.
const PAYWALL_ENABLED = false;

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
