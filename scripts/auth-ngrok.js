// Script para configurar el token de autenticación de ngrok
const { execSync } = require('child_process');

const authToken = '2uq5vYz4Ef9BfL23OdFW57cKZSv_Mhkrvq5L9roBozkzoukY';

try {
  console.log('Configurando token de autenticación de ngrok...');
  
  // Usar el módulo npm de ngrok para configurar el token
  execSync(`npx ngrok authtoken ${authToken}`, { stdio: 'inherit' });
  
  console.log('Token de ngrok configurado con éxito.');
} catch (error) {
  console.error('Error al configurar token de ngrok:', error.message);
  process.exit(1);
}
