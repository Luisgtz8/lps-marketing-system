from datetime import date, timedelta

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
