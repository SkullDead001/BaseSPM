#!/bin/bash

set -e
set -o pipefail

LOG="install.log"
CONFIG_DIR="config"

echo "" > "$LOG"

# ---------------------------------------------------------
# Manejo de errores
# ---------------------------------------------------------
fail() {
  whiptail --title "❌ Error" --msgbox \
"Se produjo un error durante la instalación.

📄 Revisa el archivo:
$LOG" 12 60
  exit 1
}

log() { echo "[INFO] $1" >> "$LOG"; }

# ---------------------------------------------------------
# Barra de progreso
# ---------------------------------------------------------
progress() {
  echo $1
  echo "# $2"
  sleep 0.25
}

# ---------------------------------------------------------
# Verificar whiptail
# ---------------------------------------------------------
if ! command -v whiptail >/dev/null 2>&1; then
  sudo apt update -y >>"$LOG" 2>&1 || fail
  sudo apt install -y whiptail >>"$LOG" 2>&1 || fail
fi

# ---------------------------------------------------------
# INSTALAR NODE.JS v20 (NodeSource)
# ---------------------------------------------------------
install_node() {
  log "Verificando Node.js"

  if command -v node >/dev/null 2>&1; then
    CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$CURRENT_NODE" -eq 20 ]; then
      log "Node.js v20 ya instalado"
      return
    fi
  fi

  log "Instalando Node.js v20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >>"$LOG" 2>&1 || fail
  sudo apt install -y nodejs >>"$LOG" 2>&1 || fail
}

install_node

# ---------------------------------------------------------
# Pantalla inicial
# ---------------------------------------------------------
whiptail --title "⚡ SUPREM-BOT Installer" --msgbox \
"Este instalador configurará:

• 🟢 Node.js v20
• 🐍 Entorno Python completo
• 📦 Dependencias NPM (en /config)
• 🎵 yt-dlp

✔ Instalación limpia
✔ Estructura profesional
✔ Sin archivos sueltos

Presiona OK para continuar." 18 70

# ---------------------------------------------------------
# Preparar carpeta config
# ---------------------------------------------------------
mkdir -p "$CONFIG_DIR"
cd "$CONFIG_DIR"

# ---------------------------------------------------------
# NPM DEPENDENCIAS
# ---------------------------------------------------------
{
  progress 10 "Inicializando entorno NPM en /config"
  npm init -y >>"$LOG" 2>&1 || fail

  progress 40 "Instalando dependencias del bot"
  npm install --save \
    chalk@4 cli-table3 luxon openai \
    @whiskeysockets/baileys@latest megajs \
    qrcode-terminal pino wa-sticker-formatter \
    ytdl-core dotenv node-fetch@2 \
    axios gradient-string better-sqlite3 \
    @google/generative-ai gradient-string better-sqlite3 >>"$LOG" 2>&1 || fail

  progress 100 "Dependencias instaladas en /config"
} | whiptail --title "📦 NPM" --gauge "Instalando módulos Node.js..." 8 70 0

cd ..

# npm install chalk@4 cli-table3 luxon openai @whiskeysockets/baileys@latest megajs qrcode-terminal pino wa-sticker-formatter ytdl-core dotenv node-fetch@2 axios gradient-string better-sqlite3 @google/generative-ai gradient-string better-sqlite3
# ---------------------------------------------------------
# PYTHON — DEPENDENCIAS BASE
# ---------------------------------------------------------
{
  progress 10 "Actualizando repositorios APT"
  sudo apt update -y >>"$LOG" 2>&1 || fail

  progress 40 "Instalando Python y herramientas base"
  sudo apt install -y \
    python3 python3-pip python3-venv python3-dev \
    build-essential >>"$LOG" 2>&1 || fail

  progress 70 "Actualizando pip, setuptools y wheel"
  python3 -m pip install --upgrade pip setuptools wheel >>"$LOG" 2>&1 || fail

  progress 100 "Entorno Python listo"
} | whiptail --title "🐍 Python" --gauge "Configurando entorno Python..." 8 70 0

# ---------------------------------------------------------
# YT-DLP
# ---------------------------------------------------------
{
  progress 30 "Instalando yt-dlp"
  python3 -m pip install -U yt-dlp >>"$LOG" 2>&1 || fail

  progress 80 "Verificando yt-dlp"
  yt-dlp --version >>"$LOG" 2>&1 || fail

  progress 100 "yt-dlp listo"
} | whiptail --title "🎵 yt-dlp" --gauge "Configurando descargas multimedia..." 8 70 0

# ---------------------------------------------------------
# RESUMEN FINAL
# ---------------------------------------------------------
NODE_VER=$(node -v 2>/dev/null || echo "No detectado")
NPM_VER=$(npm -v 2>/dev/null || echo "No detectado")
PY_VER=$(python3 --version 2>/dev/null || echo "No detectado")
YTDLP_VER=$(yt-dlp --version 2>/dev/null || echo "No detectado")

whiptail --title "✅ Instalación completada" --msgbox \
"SUPREM-BOT se ha configurado correctamente.

📁 Dependencias en:
  /config

🔹 Node.js: $NODE_VER
🔹 npm:     $NPM_VER
🔹 Python:  $PY_VER
🔹 yt-dlp:  $YTDLP_VER

🚀 Para iniciar el bot:
  node index.js
" 19 70

clear
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ SUPREM-BOT — Instalación finalizada"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 📁 NPM en: config/"
echo " Node.js : $NODE_VER"
echo " npm     : $NPM_VER"
echo " Python  : $PY_VER"
echo " yt-dlp  : $YTDLP_VER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

