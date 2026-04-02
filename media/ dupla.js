const fs = require('fs');
const path = require('path');

// --- CONFIGURACIÓN ---

// 1. Define la ubicación del directorio 'media'.
// __dirname se refiere al directorio actual del script. '../' sube un nivel.
const mediaDir = path.join(__dirname, '..', 'media');

// 2. Define la ruta completa del archivo original que quieres copiar.
const archivoOriginal = path.join(mediaDir, 'avatar.png');

// 3. Lista de los nombres para las nuevas copias.
const nombresDeCopias = [
  'admin.png',
  'bienvenida.png',
  'despedida.png',
  'menu.png',
  'priv.png',
  'antilink.png',
  'desc.png',
  'fantasmas.png',
  'promote.png',
  'demote.png',
  'resetlink.png',
  'unmute.png',
  'menu2.png',
  'todos.png'
];

// --- LÓGICA DEL SCRIPT ---

try {
  // Primero, verifica si el archivo original existe para evitar errores.
  if (!fs.existsSync(archivoOriginal)) {
    // Si no existe, muestra un error y detiene el script.
    console.error(`❌ Error: El archivo original no se encontró en la ruta: ${archivoOriginal}`);
    process.exit(1); // Termina el proceso con un código de error.
  }

  console.log(`📄 Iniciando copia desde: ${archivoOriginal}`);

  // Recorre la lista de nombres para crear cada copia.
  nombresDeCopias.forEach(nuevoNombre => {
    // Construye la ruta completa para el nuevo archivo de destino.
    const rutaDestino = path.join(mediaDir, nuevoNombre);

    // Copia el archivo original a la nueva ruta.
    // fs.copyFileSync es un método síncrono (espera a que termine la copia antes de continuar).
    fs.copyFileSync(archivoOriginal, rutaDestino);

    // Muestra un mensaje de éxito por cada archivo creado.
    console.log(`✅ Copia creada exitosamente: ${nuevoNombre}`);
  });

  console.log('\n🎉 ¡Proceso completado! Todas las imágenes han sido generadas.');

} catch (error) {
  // Si ocurre cualquier otro error durante el proceso (ej. permisos de escritura), lo captura aquí.
  console.error('🔥 Ocurrió un error inesperado durante la copia:', error);
}