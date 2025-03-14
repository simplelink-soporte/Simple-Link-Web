$filePath = "c:/Users/uriel08/Documents/GitHub/Simple-Link-Web/src/components/classes-registration/steps/ConfirmationStep.tsx"
$content = Get-Content -Path $filePath -Raw

# Crear el nuevo contenido reemplazando la redirección al paso 'payment' por 'summary'
$newContent = $content -replace "goToStep\('payment'\)", "goToStep('summary')"

# Modificar el comentario
$newContent = $newContent -replace "// Si no hay IDs de reserva o el estado no es success, redirigir al paso de pago", "// Si no hay IDs de reserva o el estado no es success, redirigir al paso de resumen"

# Agregar logs para debuggear
$newContent = $newContent -replace "if \(state\.bookingIds\.length === 0 \|\| state\.bookingStatus !== 'success'\) \{", "if (state.bookingIds.length === 0 || state.bookingStatus !== 'success') {`n      console.log('No hay reservas confirmadas, redirigiendo a resumen')"

$newContent = $newContent -replace "goToStep\('summary'\)", "goToStep('summary')`n    } else {`n      console.log('Reservas confirmadas:', state.bookingIds)"

# Guardar el archivo modificado
Set-Content -Path $filePath -Value $newContent -NoNewline
Write-Host "Archivo actualizado correctamente."
