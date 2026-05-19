"""
generate_qr.py
──────────────
Genera los códigos QR para los bastones XGIO.
El contenido del QR es el cane_id que se guarda en Firestore al registrar usuario.

USO:
  python tools/generate_qr.py

Edita la lista BASTONES abajo para cambiar los IDs que quieras generar.
Los QR se guardan en tools/qr_output/ como PNG.

Requiere: pip install qrcode[pil]
"""

import os
import qrcode
from qrcode.constants import ERROR_CORRECT_H

# ─── CONFIGURA AQUÍ LOS IDs DE TUS BASTONES ──────────────────────────────────

BASTONES = [
    "XGIO-BASTON-1",
    "XGIO-BASTON-2",
    "XGIO-BASTON-3",
    "XGIO-BASTON-4",
]
# ─────────────────────────────────────────────────────────────────────────────

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "qr_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

for baston_id in BASTONES:
    qr = qrcode.QRCode(
        version=None,           # tamaño automático
        error_correction=ERROR_CORRECT_H,  # máxima corrección de errores
        box_size=12,
        border=4,
    )
    qr.add_data(baston_id)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    filename = f"{baston_id.replace(':', '_').replace(' ', '_')}.png"
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath)

    print(f"[OK] QR generado -> {filepath}  (contenido: '{baston_id}')")

print(f"\n[DONE] Todos los QR guardados en: {OUTPUT_DIR}")
