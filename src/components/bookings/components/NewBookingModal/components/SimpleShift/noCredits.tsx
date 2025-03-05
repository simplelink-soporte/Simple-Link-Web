export default function NoCredits() {
  const handleViewPlans = () => {
    window.location.href = '/admin/dashboard/upgrade'; // Redirigir a la página de planes
  };

  return (
    <div className="flex flex-col justify-center items-center h-full p-4 text-center">
      <img src="/images/Miroodles - No credits.png" alt="No Credits" className="mb-4 w-1/2" />
      <h2 className="text-lg font-normal text-gray-600">No tienes créditos disponibles</h2>
      <p className="text-gray-500">Por favor, adquiere más créditos para realizar reservas.</p>
      <button onClick={handleViewPlans} className="mt-4 text-gray-600 font-medium">Ver Planes</button>
    </div>
  );
}
