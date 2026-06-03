from datetime import date, timedelta
from reminder import filter_pending_followups

def make_prospect(nombre, estado, dias_desde_contacto):
    ultimo = date.today() - timedelta(days=dias_desde_contacto) if dias_desde_contacto is not None else None
    return {
        "nombre": nombre,
        "empresa": "Empresa Test",
        "segmento": "pyme",
        "estado": estado,
        "ultimo_contacto": ultimo.isoformat() if ultimo else None,
        "notas": "",
    }

def test_incluye_prospecto_con_3_dias_sin_respuesta():
    prospects = [make_prospect("Ana", "Contactado", 3)]
    result = filter_pending_followups(prospects)
    assert len(result) == 1
    assert result[0]["nombre"] == "Ana"

def test_excluye_prospecto_con_2_dias():
    prospects = [make_prospect("Luis", "Contactado", 2)]
    result = filter_pending_followups(prospects)
    assert len(result) == 0

def test_excluye_estado_cerrado():
    prospects = [make_prospect("Pedro", "Cerrado", 10)]
    result = filter_pending_followups(prospects)
    assert len(result) == 0

def test_excluye_estado_descartado():
    prospects = [make_prospect("Marta", "Descartado", 10)]
    result = filter_pending_followups(prospects)
    assert len(result) == 0

def test_incluye_sin_contacto_registrado():
    prospects = [make_prospect("Carlos", "Identificado", None)]
    result = filter_pending_followups(prospects)
    assert len(result) == 1

def test_multiples_prospectos_mixtos():
    prospects = [
        make_prospect("Ana", "Contactado", 4),
        make_prospect("Luis", "Contactado", 1),
        make_prospect("Pedro", "Cerrado", 10),
        make_prospect("Carlos", "Identificado", None),
    ]
    result = filter_pending_followups(prospects)
    assert len(result) == 2
    nombres = [p["nombre"] for p in result]
    assert "Ana" in nombres
    assert "Carlos" in nombres
