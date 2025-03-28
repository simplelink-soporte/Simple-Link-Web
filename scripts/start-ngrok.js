const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Puerto que usa tu aplicación Next.js (normalmente 3000)
const PORT = process.env.PORT || 3000;

console.log(`[Ngrok] Iniciando túnel para el puerto ${PORT}...`);

try {
  // Ejecutar ngrok y capturar la salida
  const ngrokOutput = execSync(`ngrok http ${PORT} --log=stdout`).toString();
  
  // Intentar extraer la URL HTTPS
  const httpsUrlMatch = ngrokOutput.match(/https:\/\/[a-zA-Z0-9-]+\.ngrok\.io/);
  
  if (httpsUrlMatch && httpsUrlMatch[0]) {
    const ngrokUrl = httpsUrlMatch[0];
    console.log(`[Ngrok] Túnel establecido: ${ngrokUrl}`);
    
    // Guardar la URL para usarla en la aplicación
    const envLocalPath = path.join(__dirname, '..', '.env.development.local');
    
    // Leer el archivo .env.development.local existente o crear uno nuevo
    let envContent = '';
    try {
      if (fs.existsSync(envLocalPath)) {
        envContent = fs.readFileSync(envLocalPath, 'utf8');
      }
    } catch (err) {
      console.warn('No se pudo leer .env.development.local:', err.message);
    }
    
    // Reemplazar o agregar la variable NEXT_PUBLIC_NGROK_URL
    if (envContent.includes('NEXT_PUBLIC_NGROK_URL=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_NGROK_URL=.*/,
        `NEXT_PUBLIC_NGROK_URL=${ngrokUrl}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_NGROK_URL=${ngrokUrl}\n`;
    }
    
    // Guardar el archivo actualizado
    fs.writeFileSync(envLocalPath, envContent);
    console.log(`[Ngrok] URL guardada en ${envLocalPath}`);
    
    console.log('\n[Ngrok] Configuración completada. Para usar esta URL en Mercado Pago:');
    console.log(`1. Configura ${ngrokUrl}/api/mercadopago/callback como URL de redirección en el panel de Mercado Pago`);
    console.log('2. Inicia tu aplicación Next.js en otra terminal con: npm run dev');
    console.log('3. La aplicación usará automáticamente la URL de ngrok cuando esté disponible\n');
  } else {
    console.error('[Ngrok] No se pudo obtener la URL HTTPS del túnel');
  }
} catch (error) {
  console.error('[Ngrok] Error al iniciar ngrok:', error.message);
  console.log('\n[Ngrok] Asegúrate de:');
  console.log('1. Tener ngrok instalado: npm install -g ngrok');
  console.log('2. Haber autenticado ngrok: ngrok authtoken TU_TOKEN');
  process.exit(1);
}
