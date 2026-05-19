# api/index.py
# Backend XGIO - Flask desplegado en Vercel

from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
import jwt
import datetime
import os
import polyline as pl

app = Flask(__name__)
CORS(app)

# ─── Inicializar Firebase Admin ───────────────────────────────────────────────
# En Vercel las credenciales van como variables de entorno
if not firebase_admin._apps:
    cred = credentials.Certificate(
        os.path.join(os.path.dirname(__file__), "serviceAccount.json")
    )
    firebase_admin.initialize_app(cred)

db = firestore.client()
JWT_SECRET = os.environ.get("JWT_SECRET", "xgio_secret_key_cambiar_en_produccion")

# ─── Helpers ──────────────────────────────────────────────────────────────────
def get_uid_from_token(request):
    """Extrae y valida el JWT del header Authorization."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, jsonify({"error": "Token requerido"}), 401
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("uid"), None, None
    except jwt.ExpiredSignatureError:
        return None, jsonify({"error": "Token expirado"}), 401
    except jwt.InvalidTokenError:
        return None, jsonify({"error": "Token inválido"}), 401

def today_str():
    mexico = datetime.timezone(datetime.timedelta(hours=-6))
    return datetime.datetime.now(mexico).strftime("%Y-%m-%d")

# ─── POST /register ───────────────────────────────────────────────────────────
@app.route("/register", methods=["POST"])
def register():
    """
    Body: { email, password, name, cane_id (opcional) }
    Crea el usuario en Firebase Authentication y guarda sus datos en Firestore.
    Devuelve un JWT para que la app inicie sesión automáticamente.
    """
    data = request.get_json()
    email    = data.get("email", "").strip()
    password = data.get("password", "")
    name     = data.get("name", "").strip()
    cane_id  = data.get("cane_id", "").strip()

    if not email or not password:
        return jsonify({"error": "Email y contraseña requeridos"}), 400
    if len(password) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400
    if not cane_id:
        return jsonify({"error": "Debes escanear el código QR del bastón"}), 400

    try:
        # 1. Crear el usuario en Firebase Auth
        # firebase_auth.create_user lanza ValueError o FirebaseError si falla
        user_record = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=name
        )
        uid = user_record.uid

        # 2. Guardar los datos en Firestore (colección "users")
        user_data = {
            "email": email,
            "name": name,
            "cane_id": cane_id,
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        db.collection("users").document(uid).set(user_data)

        # 3. Generar JWT propio para iniciar sesión de inmediato
        payload = {
            "uid":   uid,
            "email": email,
            "name":  name,
            "exp":   datetime.datetime.utcnow() + datetime.timedelta(days=30),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return jsonify({
            "success": True,
            "message": "Usuario registrado exitosamente",
            "token":   token,
            "uid":     uid,
            "email":   email,
            "name":    name,
            "cane_id": cane_id
        }), 201

    except firebase_auth.EmailAlreadyExistsError:
        return jsonify({"error": "Este correo ya está registrado"}), 400
    except Exception as e:
        return jsonify({"error": f"Error al registrar: {str(e)}"}), 500

# ─── POST /login ──────────────────────────────────────────────────────────────
@app.route("/login", methods=["POST"])
def login():
    """
    Body: { email, password }
    Usa Firebase Auth para verificar credenciales y devuelve JWT propio.
    """
    data = request.get_json()
    email    = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email y contraseña requeridos"}), 400

    try:
        # Verificar con Firebase Auth REST API
        import requests as req
        api_key = os.environ.get("FIREBASE_API_KEY")
        r = req.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
            json={"email": email, "password": password, "returnSecureToken": True}
        )
        if r.status_code != 200:
            err = r.json().get("error", {}).get("message", "Credenciales inválidas")
            return jsonify({"error": err}), 401

        firebase_data = r.json()
        uid = firebase_data["localId"]

        # Obtener datos del usuario desde Firestore
        user_doc = db.collection("users").document(uid).get()
        user_data = user_doc.to_dict() if user_doc.exists else {}

        # Generar JWT propio
        payload = {
            "uid":   uid,
            "email": email,
            "name":  user_data.get("name", email.split("@")[0]),
            "exp":   datetime.datetime.utcnow() + datetime.timedelta(days=30),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return jsonify({
            "token":   token,
            "uid":     uid,
            "email":   email,
            "name":    payload["name"],
            "cane_id": user_data.get("cane_id"),
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── POST /send-current-location ─────────────────────────────────────────────
@app.route("/send-current-location", methods=["POST"])
def send_current_location():
    """
    Body: { latitude, longitude, cane_id }
    Guarda la ubicación en Firestore bajo users/{uid}/CurrentLocation/{fecha}
    """
    uid, err_response, status = get_uid_from_token(request)
    if err_response:
        return err_response, status

    data      = request.get_json()
    latitude  = data.get("latitude")
    longitude = data.get("longitude")
    cane_id   = data.get("cane_id")

    if latitude is None or longitude is None:
        return jsonify({"error": "latitude y longitude requeridos"}), 400

    timestamp = datetime.datetime.utcnow().isoformat()
    date_key  = today_str()

    location_entry = {
        "latitude":  latitude,
        "longitude": longitude,
        "timestamp": timestamp,
    }

    # Referencia al documento del día actual
    doc_ref = (
        db.collection("users")
          .document(uid)
          .collection("CurrentLocation")
          .document(date_key)
    )

    doc = doc_ref.get()
    if doc.exists:
        # Agregar al array existente
        doc_ref.update({
            "locations": firestore.ArrayUnion([location_entry])
        })
    else:
        # Crear documento nuevo para el día
        doc_ref.set({
            "date":      date_key,
            "locations": [location_entry],
        })

    return jsonify({"success": True, "timestamp": timestamp})

# ─── GET /get-latest-location ─────────────────────────────────────────────────
@app.route("/get-latest-location", methods=["GET"])
def get_latest_location():
    """Devuelve la última ubicación registrada del usuario."""
    uid, err_response, status = get_uid_from_token(request)
    if err_response:
        return err_response, status

    try:
        doc_ref = (
            db.collection("users")
              .document(uid)
              .collection("CurrentLocation")
              .document(today_str())
        )
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "Sin ubicación hoy"}), 404

        locations = doc.to_dict().get("locations", [])
        if not locations:
            return jsonify({"error": "Sin ubicaciones registradas"}), 404

        latest = locations[-1]
        return jsonify({
            "latitude":  latest["latitude"],
            "longitude": latest["longitude"],
            "timestamp": latest["timestamp"],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── GET /get-current-location ────────────────────────────────────────────────
@app.route("/get-current-location", methods=["GET"])
def get_current_location():
    """Devuelve todos los puntos del día actual."""
    uid, err_response, status = get_uid_from_token(request)
    if err_response:
        return err_response, status

    try:
        doc_ref = (
            db.collection("users")
              .document(uid)
              .collection("CurrentLocation")
              .document(today_str())
        )
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"locations": []})

        return jsonify({"locations": doc.to_dict().get("locations", [])})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── GET /get-polyline?date=YYYY-MM-DD ────────────────────────────────────────
@app.route("/get-polyline", methods=["GET"])
def get_polyline():
    """Devuelve la polyline encodificada de Google Maps para un día específico."""
    uid, err_response, status = get_uid_from_token(request)
    if err_response:
        return err_response, status

    date = request.args.get("date", today_str())

    try:
        doc_ref = (
            db.collection("users")
              .document(uid)
              .collection("CurrentLocation")
              .document(date)
        )
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"polyline": "", "locations": []})

        locations = doc.to_dict().get("locations", [])
        if not locations:
            return jsonify({"polyline": "", "locations": []})

        # Generar polyline encodificada
        coords = [(loc["latitude"], loc["longitude"]) for loc in locations]
        encoded = pl.encode(coords)

        return jsonify({
            "polyline":  encoded,
            "locations": locations,
            "date":      date,
            "count":     len(locations),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── GET /get-routes ──────────────────────────────────────────────────────────
@app.route("/get-routes", methods=["GET"])
def get_routes():
    """Devuelve el historial de días con recorridos registrados."""
    uid, err_response, status = get_uid_from_token(request)
    if err_response:
        return err_response, status

    try:
        docs = (
            db.collection("users")
              .document(uid)
              .collection("CurrentLocation")
              .stream()
        )

        routes = []
        for doc in docs:
            data      = doc.to_dict()
            locations = data.get("locations", [])
            routes.append({
                "date":  doc.id,          # "YYYY-MM-DD"
                "count": len(locations),
            })

        # Ordenar de más reciente a más antiguo
        routes.sort(key=lambda x: x["date"], reverse=True)
        return jsonify(routes)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── Health check ─────────────────────────────────────────────────────────────
@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "XGIO API running ✓"})

if __name__ == "__main__":
    app.run(debug=True)
