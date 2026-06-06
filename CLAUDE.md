# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Two unrelated deliverables live side-by-side:

1. **Daily Telegram follow-up reminder** (Python) — `reminder.py`, `message_templates.py`, scheduled by `.github/workflows/daily_reminder.yml`. Pulls prospects from a Supabase table `lps_prospects`, filters to ones needing follow-up, and posts a formatted message to Telegram.
2. **Lightning Pro landing page** (static site) — `docs/` is published via GitHub Pages. It is plain HTML/CSS, no build step. Note: the directory was renamed from `landing/` to `docs/` specifically so GitHub Pages would serve it (see commit `ab1a9e1`); do not rename it back.

Spanish is the language for prospect data, user-facing copy, and message templates. Keep new copy in Spanish unless explicitly asked otherwise.

## Commands

```powershell
# Install (use venv)
python -m venv venv; .\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run tests
pytest                         # all tests
pytest test_reminder.py::test_incluye_prospecto_con_3_dias_sin_respuesta  # one test

# Run the reminder locally (needs .env with the 4 vars in .env.example)
python reminder.py
```

The GitHub Action runs `python reminder.py` on cron `0 15 * * 1-5` (15:00 UTC = 09:00 Hermosillo, Mon–Fri) and on `workflow_dispatch`. Secrets `SUPABASE_URL`, `SUPABASE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` must exist in repo settings.

## Follow-up logic (the load-bearing piece)

`filter_pending_followups` in `reminder.py:14` is what the cron is built around. The rules:

- Only prospects with `estado` in `{Identificado, Contactado, Reunión, Propuesta}` are considered active. `Cerrado` and `Descartado` are silently dropped.
- `ultimo_contacto = None` → always included (never contacted yet).
- Otherwise included only when `(today - ultimo_contacto).days >= DIAS_UMBRAL` (currently 3).

`build_message` then picks a Spanish template per `segmento` (`camara`, `despacho`, `pyme`, or a default fallback) from `message_templates.py`. Telegram message uses HTML parse mode, so any new copy must escape `<`, `>`, `&` if user-supplied.

If you change the active-states set, the threshold, or the segments, update both `reminder.py` and the corresponding tests in `test_reminder.py` together — the tests pin both behaviors.

## Supabase schema assumption

`fetch_prospects` selects exactly: `nombre, empresa, segmento, estado, ultimo_contacto, notas` from `lps_prospects`. Schema is owned externally (Supabase project), not in this repo. If a field is renamed in Supabase, both the `select` string and downstream `.get(...)`/indexing in `build_message` must change.

## Landing page

`docs/index.html` is a single file with inline `<style>` plus `docs/style.css`; images in `docs/img/*.webp`. No bundler, no framework. Edit and commit — GitHub Pages serves from `main`/`docs`. Brand color is `--green: #F59E0B` (which is amber despite the name — don't "fix" it without checking; the variable name is reused across the file).
