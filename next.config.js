/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignorar errores de ESLint durante la compilación
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignorar errores de TypeScript durante la compilación
  typescript: {
    ignoreBuildErrors: true,
  },
  // Otras configuraciones opcionales
  reactStrictMode: true,
  // Configuración de imágenes (puedes ajustarla según tus necesidades)
  images: {
    domains: [],
    remotePatterns: [],
  },
}

module.exports = nextConfig 