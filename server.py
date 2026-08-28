import hashlib
import http.cookies
import json
import os
import secrets
import sqlite3
import threading
import urllib.parse
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "0.0.0.0"
PORT = 8000
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "calbolometro.db")
SESSIONS = {}
LOCK = threading.Lock()


def now():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000)
    return salt + "$" + digest.hex()


def password_matches(password, stored):
    try:
        salt, expected = stored.split("$", 1)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
        return secrets.compare_digest(actual, expected)
    except (ValueError, AttributeError):
        return False


def db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with db() as connection:
        connection.executescript("""
          CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL UNIQUE COLLATE NOCASE,
            senha_hash TEXT NOT NULL,
            criado_em TEXT NOT NULL,
            tema TEXT NOT NULL DEFAULT 'claro'
          );
          CREATE TABLE IF NOT EXISTS perfis (
            usuario_id INTEGER PRIMARY KEY,
            dados TEXT NOT NULL,
            atualizado_em TEXT NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
          );
          CREATE TABLE IF NOT EXISTS refeicoes (
            id TEXT PRIMARY KEY,
            usuario_id INTEGER NOT NULL,
            data_local TEXT NOT NULL,
            grupo TEXT NOT NULL,
            dados TEXT NOT NULL,
            total_kcal REAL NOT NULL,
            criado_em TEXT NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
          );
                    CREATE TABLE IF NOT EXISTS sessoes (
                        token TEXT PRIMARY KEY,
                        usuario_id INTEGER NOT NULL,
                        criada_em TEXT NOT NULL,
                        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
                    );
        """)


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    try:
        return json.loads(handler.rfile.read(length) or b"{}")
    except (ValueError, UnicodeDecodeError):
        return {}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format_string, *args):
        print("%s - %s" % (self.address_string(), format_string % args))

    def send_json(self, status, payload, cookie=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def user(self):
        cookies = http.cookies.SimpleCookie(self.headers.get("Cookie", ""))
        token = cookies.get("session")
        if not token:
            return None
        with LOCK:
            user_id = SESSIONS.get(token.value)
        if not user_id:
            with db() as connection:
                row = connection.execute("SELECT usuario_id FROM sessoes WHERE token = ?", (token.value,)).fetchone()
            if not row:
                return None
            user_id = row["usuario_id"]
        with db() as connection:
            return connection.execute("SELECT * FROM usuarios WHERE id = ?", (user_id,)).fetchone()

    def require_user(self):
        user = self.user()
        if not user:
            self.send_json(401, {"ok": False, "erro": "Sessao expirada. Entre novamente."})
        return user

    def do_GET(self):
        if self.path == "/api/session":
            user = self.user()
            self.send_json(200, {"ok": True, "usuario": user["usuario"] if user else None})
            return
        if self.path == "/api/profile":
            user = self.require_user()
            if not user:
                return
            with db() as connection:
                row = connection.execute("SELECT dados FROM perfis WHERE usuario_id = ?", (user["id"],)).fetchone()
            self.send_json(200, {"ok": True, "perfil": json.loads(row["dados"]) if row else None})
            return
        if self.path == "/api/theme":
            user = self.require_user()
            if not user:
                return
            self.send_json(200, {"ok": True, "tema": user["tema"]})
            return
        if self.path == "/api/meals":
            user = self.require_user()
            if not user:
                return
            with db() as connection:
                rows = connection.execute("SELECT id, data_local, grupo, dados, total_kcal, criado_em FROM refeicoes WHERE usuario_id = ? ORDER BY criado_em DESC", (user["id"],)).fetchall()
            meals = []
            for row in rows:
                meals.append({"id": row["id"], "dataLocal": row["data_local"], "grupo": row["grupo"], "itens": json.loads(row["dados"]), "totalKcal": row["total_kcal"], "data": row["criado_em"]})
            self.send_json(200, {"ok": True, "refeicoes": meals})
            return
        super().do_GET()

    def do_POST(self):
        data = read_json(self)
        if self.path == "/api/import-legacy":
            importados = 0
            with db() as connection:
                for antigo in data.get("users", []):
                    usuario = str(antigo.get("usuario", "")).strip()
                    senha = str(antigo.get("senha", ""))
                    if not usuario or not senha:
                        continue
                    connection.execute("INSERT OR IGNORE INTO usuarios (usuario, senha_hash, criado_em) VALUES (?, ?, ?)", (usuario, password_hash(senha), antigo.get("criadoEm") or now()))
                    user = connection.execute("SELECT id FROM usuarios WHERE usuario = ? COLLATE NOCASE", (usuario,)).fetchone()
                    if not user:
                        continue
                    user_id = user["id"]
                    perfil = (data.get("perfis") or {}).get(usuario)
                    if perfil:
                        connection.execute("INSERT OR IGNORE INTO perfis (usuario_id, dados, atualizado_em) VALUES (?, ?, ?)", (user_id, json.dumps(perfil, ensure_ascii=False), now()))
                    for refeicao in (data.get("historicos") or {}).get(usuario, []):
                        refeicao_id = str(refeicao.get("id") or (str(int(datetime.now().timestamp() * 1000)) + "-" + secrets.token_hex(3)))
                        connection.execute("INSERT OR IGNORE INTO refeicoes (id, usuario_id, data_local, grupo, dados, total_kcal, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)", (refeicao_id, user_id, str(refeicao.get("dataLocal", "")), str(refeicao.get("grupo", "")), json.dumps(refeicao.get("itens", []), ensure_ascii=False), float(refeicao.get("totalKcal", 0)), refeicao.get("data") or now()))
                    importados += 1
            self.send_json(200, {"ok": True, "importados": importados})
            return
        if self.path == "/api/register":
            usuario = str(data.get("usuario", "")).strip()
            senha = str(data.get("senha", ""))
            if not usuario or len(senha) < 4:
                self.send_json(400, {"ok": False, "erro": "Informe um usuario e uma senha com pelo menos 4 caracteres."})
                return
            try:
                with db() as connection:
                    cursor = connection.execute("INSERT INTO usuarios (usuario, senha_hash, criado_em) VALUES (?, ?, ?)", (usuario, password_hash(senha), now()))
                    user_id = cursor.lastrowid
            except sqlite3.IntegrityError:
                self.send_json(409, {"ok": False, "erro": "Este usuario ja esta cadastrado."})
                return
            self.login_user(user_id, usuario)
            return
        if self.path == "/api/login":
            usuario = str(data.get("usuario", "")).strip()
            with db() as connection:
                user = connection.execute("SELECT * FROM usuarios WHERE usuario = ? COLLATE NOCASE", (usuario,)).fetchone()
            if not user or not password_matches(str(data.get("senha", "")), user["senha_hash"]):
                self.send_json(401, {"ok": False, "erro": "Usuario ou senha invalidos."})
                return
            self.login_user(user["id"], user["usuario"])
            return
        if self.path == "/api/logout":
            self.logout_user()
            return
        if self.path == "/api/meals":
            user = self.require_user()
            if not user:
                return
            meal_id = str(data.get("id") or (str(int(datetime.now().timestamp() * 1000)) + "-" + secrets.token_hex(3)))
            itens = data.get("itens") or []
            with db() as connection:
                connection.execute("INSERT OR REPLACE INTO refeicoes (id, usuario_id, data_local, grupo, dados, total_kcal, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)", (meal_id, user["id"], str(data.get("dataLocal", "")), str(data.get("grupo", "")), json.dumps(itens, ensure_ascii=False), float(data.get("totalKcal", 0)), now()))
            self.send_json(200, {"ok": True, "id": meal_id})
            return
        self.send_json(404, {"ok": False, "erro": "Rota nao encontrada."})

    def do_PUT(self):
        data = read_json(self)
        user = self.require_user()
        if not user:
            return
        if self.path == "/api/profile":
            profile = data.get("perfil") or {}
            with db() as connection:
                connection.execute("INSERT OR REPLACE INTO perfis (usuario_id, dados, atualizado_em) VALUES (?, ?, ?)", (user["id"], json.dumps(profile, ensure_ascii=False), now()))
            self.send_json(200, {"ok": True, "perfil": profile})
            return
        if self.path == "/api/theme":
            tema = "escuro" if data.get("tema") == "escuro" else "claro"
            with db() as connection:
                connection.execute("UPDATE usuarios SET tema = ? WHERE id = ?", (tema, user["id"]))
            self.send_json(200, {"ok": True, "tema": tema})
            return
        self.send_json(404, {"ok": False, "erro": "Rota nao encontrada."})

    def do_DELETE(self):
        user = self.require_user()
        if not user:
            return
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/meals":
            meal_id = urllib.parse.parse_qs(parsed.query).get("id", [""])[0]
            with db() as connection:
                connection.execute("DELETE FROM refeicoes WHERE id = ? AND usuario_id = ?", (meal_id, user["id"]))
            self.send_json(200, {"ok": True})
            return
        self.send_json(404, {"ok": False, "erro": "Rota nao encontrada."})

    def login_user(self, user_id, usuario):
        token = secrets.token_urlsafe(32)
        with LOCK:
            SESSIONS[token] = user_id
        with db() as connection:
            connection.execute("INSERT OR REPLACE INTO sessoes (token, usuario_id, criada_em) VALUES (?, ?, ?)", (token, user_id, now()))
        cookie = "session=%s; Path=/; HttpOnly; SameSite=Lax" % token
        self.send_json(200, {"ok": True, "usuario": usuario}, cookie)

    def logout_user(self):
        cookies = http.cookies.SimpleCookie(self.headers.get("Cookie", ""))
        token = cookies.get("session")
        if token:
            with LOCK:
                SESSIONS.pop(token.value, None)
            with db() as connection:
                connection.execute("DELETE FROM sessoes WHERE token = ?", (token.value,))
        self.send_json(200, {"ok": True}, "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("Callbolometro online em http://%s:%s" % (HOST, PORT))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
