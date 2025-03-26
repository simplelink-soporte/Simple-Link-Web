const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Directorio raíz del proyecto
const rootDir = path.join(__dirname, '..');

// Archivo para guardar PID para limpieza posterior
const pidFile = path.join(__dirname, '.dev-with-ngrok.pid');

// Función para guardar el PID actual para limpieza
function savePid() {
  fs.writeFileSync(pidFile, process.pid.toString());
}

// Guardar el PID para limpieza
savePid();

// Función para iniciar un proceso y loguear su salida
function startProcess(command, args, name) {
  console.log(`[${name}] Iniciando proceso: ${command} ${args.join(' ')}`);
  
  const proc = spawn(command, args, {
    cwd: rootDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });
  
  proc.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[${name}] ${output}`);
    }
  });
  
  proc.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`[${name}] ${output}`);
    }
  });
  
  proc.on('error', (error) => {
    console.error(`[${name}] Error: ${error.message}`);
  });
  
  proc.on('close', (code) => {
    console.log(`[${name}] Proceso terminado con código: ${code}`);
  });
  
  return proc;
}

// Iniciar ngrok en un proceso separado
console.log('Iniciando entorno de desarrollo con túnel ngrok...');
const ngrokProcess = startProcess('node', ['scripts/start-ngrok.js'], 'Ngrok');

// Esperar 5 segundos para que ngrok se inicialice
setTimeout(() => {
  // Iniciar la aplicación Next.js
  const nextProcess = startProcess('npm', ['run', 'dev'], 'Next.js');
  
  // Manejar señales para cerrar procesos limpiamente
  process.on('SIGINT', () => {
    console.log('\nCerrando procesos...');
    nextProcess.kill();
    ngrokProcess.kill();
    
    // Eliminar archivo PID
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
    
    process.exit(0);
  });
}, 5000);

console.log('Para detener, presiona Ctrl+C');
