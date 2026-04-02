#!/usr/bin/env python3
# download-any-audio.py — versión FINAL estable (YouTube 2026)

import sys
import os
import subprocess
import shutil


# =========================
# 🔍 VERIFICACIONES
# =========================
def require(cmd, name):
    if shutil.which(cmd) is None:
        print(f"Error: {name} no está instalado.", file=sys.stderr)
        sys.exit(1)


# =========================
# 🎧 DESCARGA PRINCIPAL
# =========================
def download_audio(url, outdir):
    require("ffmpeg", "ffmpeg")
    require("yt-dlp", "yt-dlp")

    os.makedirs(outdir, exist_ok=True)

    # 📌 Cookies (opcional)
    cookies = os.path.join(os.path.dirname(__file__), "cookies.txt")
    has_cookies = os.path.exists(cookies)

    # 🧠 User-Agent moderno
    user_agent = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0.0.0 Safari/537.36"
    )

    # =========================
    # 🟢 INTENTO 1 — web_music (RECOMENDADO)
    # =========================
    base_cmd = [
        "yt-dlp", url,
        "-f", "bestaudio/best",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--no-playlist",
        "--no-warnings",
        "--newline",
        "--print", "after_move:filepath",
        "--user-agent", user_agent,
        "--extractor-args", "youtube:player_client=web_music",
        "--sleep-requests", "1",
        "--sleep-interval", "1",
        "--max-sleep-interval", "3",
        "-o", os.path.join(outdir, "%(id)s.%(ext)s"),
    ]

    if has_cookies:
        base_cmd.extend(["--cookies", cookies])

    print("▶️ Descargando audio (web_music)...", file=sys.stderr)

    result = subprocess.run(
        base_cmd,
        capture_output=True,
        text=True
    )

    # =========================
    # ✅ ÉXITO
    # =========================
    if result.returncode == 0:
        lines = result.stdout.strip().split("\n")
        final_path = lines[-1] if lines else ""

        if final_path and os.path.exists(final_path):
            print(final_path)
            sys.exit(0)

    # =========================
    # 🔁 FALLBACK — android (SIN cookies)
    # =========================
    print("⚠️ web_music falló, intentando android...", file=sys.stderr)

    fallback_cmd = [
        "yt-dlp", url,
        "-f", "bestaudio/best",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--no-playlist",
        "--no-warnings",
        "--newline",
        "--print", "after_move:filepath",
        "--user-agent", user_agent,
        "--extractor-args", "youtube:player_client=android",
        "--sleep-requests", "1",
        "--sleep-interval", "1",
        "--max-sleep-interval", "3",
        "-o", os.path.join(outdir, "%(id)s.%(ext)s"),
    ]

    result2 = subprocess.run(
        fallback_cmd,
        capture_output=True,
        text=True
    )

    if result2.returncode == 0:
        lines = result2.stdout.strip().split("\n")
        final_path = lines[-1] if lines else ""

        if final_path and os.path.exists(final_path):
            print(final_path)
            sys.exit(0)

    # =========================
    # ❌ ERROR FINAL CONTROLADO
    # =========================
    print(
        "❌ No se pudo descargar el audio.\n"
        "• El video puede requerir sesión adicional\n"
        "• Puede estar protegido por copyright\n"
        "• O YouTube está limitando temporalmente\n",
        file=sys.stderr
    )
    sys.exit(1)


# =========================
# ▶️ ENTRYPOINT
# =========================
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Uso: python3 download-any-audio.py <URL> <carpeta_salida>",
            file=sys.stderr
        )
        sys.exit(1)

    download_audio(sys.argv[1], sys.argv[2])
