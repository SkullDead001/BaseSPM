#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import shutil
import yt_dlp

def check_ffmpeg():
    if shutil.which("ffmpeg") is None:
        print("❌ FFmpeg no está instalado.", file=sys.stderr)
        sys.exit(1)

def hook(d):
    if d['status'] == 'downloading':
        percent = d.get('_percent_str', '').strip()
        if percent:
            print(f"[PROGRESS] {percent}", flush=True)
    elif d['status'] == 'finished':
        print("[PROGRESS] 100%", flush=True)

def download(url, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    outtmpl = os.path.join(out_dir, "%(title)s.%(ext)s")

    ydl_opts = {
        'format': 'bestvideo+bestaudio/best',
        'merge_output_format': 'mp4',
        'outtmpl': outtmpl,
        'quiet': False,
        'no_warnings': False,
        'progress_hooks': [hook],
        'noplaylist': True,
        'geo_bypass': True,
        'age_limit': 50,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://www.pornhub.com/',
            'Accept-Language': 'en-US,en;q=0.9'
        },
    }

    print(f"🎬 Descargando: {url}")
    print(f"📁 Carpeta destino: {out_dir}")
    print("--------------------------------------------------")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if not info:
                print("❌ No se pudo extraer información del video.", file=sys.stderr)
                sys.exit(1)
            filename = ydl.prepare_filename(info)
            final_path = os.path.splitext(filename)[0] + ".mp4"
            print(f"[DONE] {final_path}", flush=True)
            sys.exit(0)
    except Exception as e:
        print(f"💥 Error en Python: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python3 download-hb4.py <URL> <output_dir>", file=sys.stderr)
        sys.exit(1)

    url, out_dir = sys.argv[1], sys.argv[2]
    check_ffmpeg()
    download(url, out_dir)
