"""
export_locations.py
Exporta todos los puntos GPS de todos los usuarios a un CSV.

Uso:
  1. Pon este archivo junto a serviceAccount.json
  2. pip install firebase-admin pandas
  3. python export_locations.py
"""

import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import os

# ─── Inicializar Firebase ─────────────────────────────────────────────────────
cred = credentials.Certificate("serviceAccount.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# ─── Exportar datos ───────────────────────────────────────────────────────────
rows = []

users = db.collection("users").stream()
for user_doc in users:
    uid       = user_doc.id
    user_data = user_doc.to_dict()
    name      = user_data.get("name", uid)
    email     = user_data.get("email", "")
    cane_id   = user_data.get("cane_id", "")

    print(f"Procesando usuario: {name} ({uid})")

    locations_docs = (
        db.collection("users")
          .document(uid)
          .collection("CurrentLocation")
          .stream()
    )

    for loc_doc in locations_docs:
        date      = loc_doc.id
        loc_data  = loc_doc.to_dict()
        locations = loc_data.get("locations", [])

        for i, point in enumerate(locations):
            rows.append({
                "uid":       uid,
                "name":      name,
                "email":     email,
                "cane_id":   cane_id,
                "date":      date,
                "point_num": i + 1,
                "latitude":  point.get("latitude"),
                "longitude": point.get("longitude"),
                "timestamp": point.get("timestamp"),
            })

# ─── Guardar CSV ──────────────────────────────────────────────────────────────
if not rows:
    print("No se encontraron datos.")
else:
    df = pd.DataFrame(rows)
    df = df.sort_values(["name", "date", "point_num"])
    output = "xgio_locations.csv"
    df.to_csv(output, index=False, encoding="utf-8-sig")
    print(f"\n✅ Exportado: {output}")
    print(f"   Total de puntos: {len(df)}")
    print(f"   Usuarios: {df['name'].nunique()}")
    print(f"   Fechas: {df['date'].nunique()}")
    print(f"\n{df.groupby(['name', 'date']).size().reset_index(name='puntos').to_string()}")
