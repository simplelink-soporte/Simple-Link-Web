import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createId } from '@paralleldrive/cuid2';
import { FormPublishConfig } from '@/services/form-publishing.service';
import { generateUniqueSlug } from '@/lib/utils/slug-generator';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function POST(request: Request) {
  const requestId = createId();
  console.log(`🔄 [${requestId}] Iniciando publicación de formulario`);

  try {
    // 1. Obtener datos del request
    const config: FormPublishConfig = await request.json();
    const { userId, organizationId } = config;

    // 2. Validar datos requeridos
    if (!config.title) {
      console.warn(`⚠️ [${requestId}] Título requerido`);
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    // 3. Obtener cliente de Supabase
    const supabase = createRouteHandlerClient({ cookies });

    // 4. Verificar autenticación
    let effectiveUserId: string;
    let effectiveOrganizationId: string;

    if (isDevelopment && userId && organizationId) {
      console.log(`🔧 [${requestId}] Usando IDs de desarrollo:`, { userId, organizationId });
      effectiveUserId = userId;
      effectiveOrganizationId = organizationId;
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error(`❌ [${requestId}] Usuario no autenticado:`, authError);
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }

      // 5. Obtener empresa del usuario
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (empresaError || !empresa) {
        console.error(`❌ [${requestId}] Empresa no encontrada:`, empresaError);
        return NextResponse.json(
          { error: 'Empresa no encontrada' },
          { status: 404 }
        );
      }

      effectiveUserId = user.id;
      effectiveOrganizationId = empresa.id;
    }

    // 6. Generar slug único
    const slug = await generateUniqueSlug(config.title);
    console.log(`✅ [${requestId}] Slug generado:`, slug);

    // 7. Crear registro en company_links
    const { data: link, error: linkError } = await supabase
      .from('company_links')
      .insert({
        empresa_id: effectiveOrganizationId,
        slug,
        type: 'reservations',
        is_active: true,
        settings: {
          title: config.title,
          description: config.description,
          theme: config.theme,
          customization: config.customization
        }
      })
      .select()
      .single();

    if (linkError) {
      console.error(`❌ [${requestId}] Error al crear link:`, linkError);
      return NextResponse.json(
        { error: 'Error al publicar el formulario' },
        { status: 500 }
      );
    }

    console.log(`✅ [${requestId}] Formulario publicado:`, link.id);

    // 8. Retornar información del formulario publicado
    return NextResponse.json({
      id: link.id,
      slug: link.slug,
      url: `/forms/${link.slug}`,
      settings: link.settings,
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Error inesperado:`, error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        requestId
      },
      { status: 500 }
    );
  }
} 