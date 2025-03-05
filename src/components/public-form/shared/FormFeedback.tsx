export function FormSuccess() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-4"
    >
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-xl font-semibold">¡Gracias por tu respuesta!</h2>
      <p className="text-gray-500">
        Hemos recibido tu información correctamente
      </p>
    </motion.div>
  );
} 