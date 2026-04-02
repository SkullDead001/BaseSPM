#!/usr/bin/env python3
# Archivo: data/python/download-video.py (ANTI-403 + COOKIES 2025)

import sys
import os
import subprocess
import shutil


def check_ffmpeg():
    """Verifica que ffmpeg esté instalado."""
    if shutil.which("ffmpeg") is None:
        print("Error Crítico: ffmpeg no está instalado.", file=sys.stderr)
        sys.exit(1)


def check_ytdlp():
    """Verifica que yt-dlp esté instalado."""
    if shutil.which("yt-dlp") is None:
        print("Error Crítico: yt-dlp no está instalado.", file=sys.stderr)
        sys.exit(1)


def run_download(url, output_path, fallback=False):
    """Ejecuta yt-dlp con soporte de cookies y cabeceras modernas."""
    cookies_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
    has_cookies = os.path.exists(cookies_path)

    output_template = os.path.join(output_path, '%(id)s.%(ext)s')

    user_agent = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0.0.0 Safari/537.36"
    )

    format_str = (
        'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        if not fallback else 'best[height<=720]/best'
    )

    command = [
        'yt-dlp', url,
        '-f', format_str,
        '--merge-output-format', 'mp4',
        '--no-warnings',
        '--no-progress',
        '--buffer-size', '16M',
        '--geo-bypass',
        '--newline',
        '--print', 'after_move:filepath',
        '--add-header', f'User-Agent:{user_agent}',
        '--add-header', 'Referer:https://www.youtube.com/',
        '-o', output_template
    ]

    if has_cookies:
        command.extend(['--cookies', cookies_path])

    return subprocess.run(
        command,
        capture_output=True,
        text=True
    )


def extract_final_path(stdout_text):
    """Extrae la última línea válida como ruta."""
    if not stdout_text:
        return ""
    lines = [l.strip() for l in stdout_text.splitlines() if l.strip()]
    return lines[-1] if lines else ""


def download_video(url, output_path):
    """Gestiona la descarga del video y el manejo de errores."""
    try:
        check_ffmpeg()
        check_ytdlp()
        os.makedirs(output_path, exist_ok=True)

        # Primer intento
        result = run_download(url, output_path)
        final_path = extract_final_path(result.stdout)

        # Reintento por error 403
        if result.returncode != 0 or not final_path or not os.path.exists(final_path):
            if "403" in result.stderr or "Forbidden" in result.stderr:
                print(
                    "⚠️  Error 403 detectado, reintentando con formato alternativo...",
                    file=sys.stderr
                )
                result = run_download(url, output_path, fallback=True)
                final_path = extract_final_path(result.stdout)

        # Validación final
        if final_path and os.path.exists(final_path):
            print(final_path)
            sys.exit(0)
        else:
            err = result.stderr.strip() or "yt-dlp no devolvió una ruta válida."
            raise Exception(err)

    except Exception as e:
        error_text = str(e).splitlines()[-1]
        print(f"Error en Python: {error_text}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(
            "Uso: python3 download-video.py <URL> <carpeta_de_salida>",
            file=sys.stderr
        )
        sys.exit(1)

    video_url = sys.argv[1]
    destination_folder = sys.argv[2]
    download_video(video_url, destination_folder)
