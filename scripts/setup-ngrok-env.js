const fs = require('fs');
const path = require('path');

// URL de ngrok que obtuvimos
const ngrokUrl = 'https://6783-34-173-69-7.ngrok-free.app';

// Ruta al archivo .env.development.local
const envPath = path.join(__dirname, '..', '.env.development.local');

console.log(`Configurando URL de ngrok: ${ngrokUrl}`);

// Contenido a escribir en el archivo
let content = '';

// Leer el archivo existente si existe
try {
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
    console.log('Archivo .env.development.local existente leído correctamente');
  }
} catch (error) {
  console.log('No se encontró archivo .env.development.local, se creará uno nuevo');
}

// Verificar si ya existe la variable NEXT_PUBLIC_NGROK_URL
if (content.includes('NEXT_PUBLIC_NGROK_URL=')) {
  // Reemplazar el valor existente
  content = content.replace(
    /NEXT_PUBLIC_NGROK_URL=.*/,
    `NEXT_PUBLIC_NGROK_URL=${ngrokUrl}`
  );
} else {
  // Agregar la variable al final
  content += `\nNEXT_PUBLIC_NGROK_URL=${ngrokUrl}\n`;
}

// Escribir el archivo actualizado
fs.writeFileSync(envPath, content);

console.log(`URL de ngrok configurada correctamente en .env.development.local`);
console.log(`Reinicia tu aplicación Next.js para aplicar los cambios`);

// Mostrar las instrucciones para Mercado Pago
console.log('\nPasos para configurar Mercado Pago:');
console.log('1. Agrega esta URL exacta en el panel de desarrolladores de Mercado Pago:');
console.log(`   ${ngrokUrl}/api/mercadopago/callback`);
console.log('2. Asegúrate de que tu aplicación Next.js use esta URL para la redirección');
