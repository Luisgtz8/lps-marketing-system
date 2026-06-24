// GET/PUT /api/progress — server-side course progress.
// Auth: Bearer session token.
//
// The frontend keeps its localStorage blob as the working copy; this endpoint
// mirrors it to Postgres so progress survives across devices and feeds the
// Phase 5 WhatsApp nudges. The blob shape matches curso.html's saveProgress():
//   { correctAnswers[], answeredQuestions[], quizAnswers{}, exercisesDone[],
//     skillsDone[], agentsDone[], puzzlesCompleted[], puzzleRetries{},
//     completedModules[] }
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
import { cors, json } from './_lib/http.js';
import { getSessionUser } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { error: 'unauthorized' });

  if (req.method === 'GET') return getProgress(res, user.id);
  if (req.method === 'PUT') return putProgress(res, user.id, req.body);
  return json(res, 405, { error: 'method_not_allowed' });
}

async function getProgress(res: VercelResponse, userId: string) {
  const [modules, quizzes, exercises] = await Promise.all([
    sql`select module_id, completed from course_progress where user_id = ${userId}`,
    sql`select question_id, selected_index, is_correct from quiz_answers where user_id = ${userId}`,
    sql`select exercise_id, kind, done, retries from exercise_submissions where user_id = ${userId}`,
  ]);

  // Reassemble the frontend blob shape.
  const completedModules = (modules as any[]).filter((m) => m.completed).map((m) => m.module_id);
  const quizAnswers: Record<string, number> = {};
  const correctAnswers: string[] = [];
  const answeredQuestions: string[] = [];
  for (const q of quizzes as any[]) {
    answeredQuestions.push(q.question_id);
    if (q.selected_index !== null) quizAnswers[q.question_id] = q.selected_index;
    if (q.is_correct) correctAnswers.push(q.question_id);
  }
  const exercisesDone: string[] = [];
  const skillsDone: string[] = [];
  const agentsDone: string[] = [];
  const puzzlesCompleted: string[] = [];
  const puzzleRetries: Record<string, number> = {};
  for (const e of exercises as any[]) {
    if (!e.done) continue;
    if (e.kind === 'exercise') exercisesDone.push(e.exercise_id);
    else if (e.kind === 'skill') skillsDone.push(e.exercise_id);
    else if (e.kind === 'agent') agentsDone.push(e.exercise_id);
    else if (e.kind === 'puzzle') { puzzlesCompleted.push(e.exercise_id); puzzleRetries[e.exercise_id] = e.retries; }
  }

  return json(res, 200, {
    correctAnswers, answeredQuestions, quizAnswers,
    exercisesDone, skillsDone, agentsDone,
    puzzlesCompleted, puzzleRetries, completedModules,
  });
}

async function putProgress(res: VercelResponse, userId: string, body: unknown) {
  const b = (body ?? {}) as Record<string, any>;
  const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
  const obj = (v: any): Record<string, any> => (v && typeof v === 'object' ? v : {});

  const correctAnswers = new Set(arr(b.correctAnswers));
  const answeredQuestions = arr(b.answeredQuestions);
  const quizAnswers = obj(b.quizAnswers);
  const exercisesDone = arr(b.exercisesDone);
  const skillsDone = arr(b.skillsDone);
  const agentsDone = arr(b.agentsDone);
  const puzzlesCompleted = arr(b.puzzlesCompleted);
  const puzzleRetries = obj(b.puzzleRetries);
  const completedModules = arr(b.completedModules);

  try {
    // Modules
    for (const mid of completedModules) {
      const n = Number(mid);
      if (!Number.isInteger(n) || n < 1 || n > 7) continue;
      await sql`
        insert into course_progress (user_id, module_id, completed, completed_at)
        values (${userId}, ${n}, true, now())
        on conflict (user_id, module_id) do update set completed = true,
          completed_at = coalesce(course_progress.completed_at, now())
      `;
    }
    // Quiz answers
    for (const qid of answeredQuestions) {
      const idx = quizAnswers[qid];
      const isCorrect = correctAnswers.has(qid);
      await sql`
        insert into quiz_answers (user_id, question_id, selected_index, is_correct)
        values (${userId}, ${String(qid)}, ${idx ?? null}, ${isCorrect})
        on conflict (user_id, question_id) do update set
          selected_index = excluded.selected_index, is_correct = excluded.is_correct
      `;
    }
    // Exercises / skills / agents / puzzles share one table, keyed by kind.
    const kinds: Array<[string[], string]> = [
      [exercisesDone, 'exercise'], [skillsDone, 'skill'], [agentsDone, 'agent'],
    ];
    for (const [ids, kind] of kinds) {
      for (const id of ids) {
        await sql`
          insert into exercise_submissions (user_id, exercise_id, kind, done)
          values (${userId}, ${String(id)}, ${kind}, true)
          on conflict (user_id, exercise_id) do update set done = true
        `;
      }
    }
    for (const id of puzzlesCompleted) {
      const retries = Number(puzzleRetries[id] ?? 0) || 0;
      await sql`
        insert into exercise_submissions (user_id, exercise_id, kind, done, retries)
        values (${userId}, ${String(id)}, 'puzzle', true, ${retries})
        on conflict (user_id, exercise_id) do update set done = true, retries = excluded.retries
      `;
    }
    return json(res, 200, { ok: true });
  } catch (err) {
    return json(res, 500, { error: 'save_failed' });
  }
}
