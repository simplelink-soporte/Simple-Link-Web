import React from 'react';
import { motion } from 'framer-motion';

export const LoginBenefits = () => {
  // Variantes para la animación del contenedor principal
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.6,
        staggerChildren: 0.3
      }
    }
  };

  // Variantes para los elementos hijos (cada sección de beneficios)
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className="max-w-md mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="mb-10" variants={itemVariants}>
        <h2 className="text-3xl font-light mb-4">Simple Link</h2>
        <p className="text-gray-400 text-base font-light leading-relaxed">
          La plataforma definitiva para gestionar tu negocio deportivo
        </p>
      </motion.div>
      
      <div className="space-y-7">
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-medium mb-2">Reservas intuitivas</h3>
          <p className="text-gray-400 text-sm font-light leading-relaxed">
            Ofrece a tus clientes un sistema de reserva de clases y pistas con una interfaz moderna, atractiva y fácil de usar.
          </p>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-medium mb-2">Gestión económica</h3>
          <p className="text-gray-400 text-sm font-light leading-relaxed">
            Disfruta de un sistema sin comisiones, con múltiples opciones de pago para tus clientes y gestión automatizada de facturas.
          </p>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-medium mb-2">Soporte garantizado</h3>
          <p className="text-gray-400 text-sm font-light leading-relaxed">
            Accede a actualizaciones constantes y asistencia técnica 24/7, para que tu negocio nunca se detenga.
          </p>
        </motion.div>
      </div>
      
      <motion.div className="mt-12 pt-6 border-t border-gray-800" variants={itemVariants}>
        <p className="text-gray-500 text-xs font-light">
          2025 Simple-Link · Potenciando negocios deportivos
        </p>
      </motion.div>
    </motion.div>
  );
};
