import os
from datetime import date, timedelta
from dotenv import load_dotenv
from supabase import create_client
import urllib.request
import json

load_dotenv()

ESTADOS_ACTIVOS = {"Identificado", "Contactado", "Reunión", "Propuesta"}
DIAS_UMBRAL = 3


def filter_pending_followups(prospects: list[dict]) -> list[dict]:
    hoy = date.today()
    resultado = []
    for p in prospects:
        if p["estado"] not in ESTADOS_ACTIVOS:
            continue
        ultimo = p.get("ultimo_contacto")
        if ultimo is None:
            resultado.append(p)
            continue
        if isinstance(ultimo, str):
            ultimo = date.fromisoformat(ultimo)
        if (hoy - ultimo).days >= DIAS_UMBRAL:
            resultado.append(p)
    return resultado


def fetch_prospects() -> list[dict]:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_KEY"]
    client = create_client(url, key)
    response = client.table("lps_prospects").select(
        "nombre, empresa, segmento, estado, ultimo_contacto, notas"
    ).execute()
    return response.data


def send_telegram(message: str) -> None:
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    chat_id = os.environ["TELEGRAM_CHAT_ID"]
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({"chat_id": chat_id, "text": message, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req)


def build_message(pending: list[dict]) -> str:
    from message_templates import get_followup_message
    hoy = date.today()
    lines = ["📋 <b>Seguimientos pendientes hoy:</b>\n"]
    for i, p in enumerate(pending, 1):
        ultimo = p.get("ultimo_contacto")
        if ultimo:
            if isinstance(ultimo, str):
                ultimo = date.fromisoformat(ultimo)
            dias = (hoy - ultimo).days
            dias_texto = f"{dias} días sin respuesta"
        else:
            dias_texto = "sin contacto registrado"
        mensaje = get_followup_message(p.get("segmento", ""), p["nombre"], 0)
        lines.append(
            f"{i}. <b>{p['nombre']}</b> ({p.get('empresa', '—')}) — {dias_texto}\n"
            f'   💬 "{mensaje}"\n'
        )
    return "\n".join(lines)


def main():
    prospects = fetch_prospects()
    pending = filter_pending_followups(prospects)
    if not pending:
        print("Sin seguimientos pendientes hoy.")
        return
    message = build_message(pending)
    send_telegram(message)
    print(f"Telegram enviado — {len(pending)} seguimiento(s) pendiente(s).")


if __name__ == "__main__":
    main()
