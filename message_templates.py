def get_followup_message(segmento: str, nombre: str, dias: int) -> str:
    templates = {
        "camara": (
            f"Hola {nombre}, ¿pudiste ver la propuesta del taller? "
            f"Quedo disponible esta semana para platicar 10 minutos, sin compromiso."
        ),
        "despacho": (
            f"Hola {nombre}, ¿tienes 15 minutos esta semana? "
            f"Quiero mostrarte algo que ya está funcionando en un despacho similar al tuyo."
        ),
        "pyme": (
            f"Hola {nombre}, ¿cómo va todo? "
            f"Quedé con ganas de platicar sobre lo que vimos — ¿te acomodo esta semana?"
        ),
    }
    return templates.get(segmento, (
        f"Hola {nombre}, ¿tienes un momento esta semana para platicar? "
        f"Quiero darte más contexto sobre el taller."
    ))
