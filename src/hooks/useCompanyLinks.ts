import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useCurrentEmpresa } from '@/hooks/useCurrentEmpresa';
import { toast } from 'sonner';

export interface CompanyLink {
  id: string;
  empresa_id: string;
  slug: string;
  type: 'classes' | 'bookings';
  is_active: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useCompanyLinks() {
  const { empresa, isLoading: isLoadingEmpresa } = useCurrentEmpresa();
  const [bookingLink, setBookingLink] = useState<CompanyLink | null>(null);
  const [classesLink, setClassesLink] = useState<CompanyLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCompanyLinks = async () => {
    if (!empresa?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const supabase = createSupabaseClient();
      console.log('Fetching company links for empresa_id:', empresa.id);
      
      const { data, error } = await supabase
        .from('company_links')
        .select('*')
        .eq('empresa_id', empresa.id);

      if (error) throw new Error(error.message);

      console.log('Retrieved company_links data:', data);

      // Filtrar por tipo y asignar a los estados correspondientes
      const links = data as CompanyLink[];
      
      // Asegurarnos de que is_active sea un booleano
      const processedLinks = links.map(link => ({
        ...link,
        is_active: Boolean(link.is_active)
      }));
      
      console.log('Processed links:', processedLinks);
      
      const bookingLinkData = processedLinks.find(link => link.type === 'bookings' && link.is_active) || null;
      const classesLinkData = processedLinks.find(link => link.type === 'classes' && link.is_active) || null;
      
      console.log('Booking link found:', bookingLinkData);
      console.log('Classes link found:', classesLinkData);
      
      setBookingLink(bookingLinkData);
      setClassesLink(classesLinkData);
    } catch (err) {
      console.error('Error fetching company links:', err);
      setError(err instanceof Error ? err : new Error('Error desconocido al obtener los enlaces'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (empresa?.id) {
      fetchCompanyLinks();
    }
  }, [empresa?.id]);

  // Generar un slug más amigable y descriptivo
  const generateSlug = (type: 'bookings' | 'classes', companyName?: string) => {
    // Crear un slug basado en el nombre de la empresa si está disponible
    const baseName = companyName ? 
      companyName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 
      type === 'bookings' ? 'reservas' : 'clases';
    
    // Añadir un identificador aleatorio para garantizar unicidad
    const randomId = Math.random().toString(36).substring(2, 6);
    
    return `${baseName}-${randomId}`;
  };

  const createLink = async (type: 'bookings' | 'classes') => {
    if (!empresa?.id) {
      throw new Error('No hay una empresa seleccionada');
    }

    try {
      // Verificar si ya existe un link activo del mismo tipo
      const existingLink = type === 'bookings' ? bookingLink : classesLink;
      
      if (existingLink && existingLink.is_active) {
        toast.info(`Ya existe un link de ${type === 'bookings' ? 'reservas' : 'clases'} activo`);
        return existingLink;
      }
      
      setIsLoading(true);
      const supabase = createSupabaseClient();
      
      // Generar un slug único y amigable
      const slug = generateSlug(type, empresa.name);
      console.log('Creating new link with slug:', slug);
      
      const { data, error } = await supabase
        .from('company_links')
        .insert({
          empresa_id: empresa.id,
          type,
          slug,
          is_active: true,
          settings: {}
        })
        .select()
        .single();

      if (error) {
        // Si el error es por slug duplicado, intentar de nuevo con otro slug
        if (error.code === '23505') { // código de error de unicidad en PostgreSQL
          console.log('Duplicate slug detected, trying with a different one');
          const newSlug = generateSlug(type, `${empresa.name}-${Date.now()}`);
          
          const retryResult = await supabase
            .from('company_links')
            .insert({
              empresa_id: empresa.id,
              type,
              slug: newSlug,
              is_active: true,
              settings: {}
            })
            .select()
            .single();
            
          if (retryResult.error) throw new Error(retryResult.error.message);
          
          console.log('Successfully created link on retry:', retryResult.data);
          
          if (type === 'bookings') {
            setBookingLink(retryResult.data as CompanyLink);
          } else {
            setClassesLink(retryResult.data as CompanyLink);
          }
          
          return retryResult.data as CompanyLink;
        }
        
        throw new Error(error.message);
      }
      
      console.log('Successfully created link:', data);
      
      // Actualizar el estado correspondiente
      if (type === 'bookings') {
        setBookingLink(data as CompanyLink);
      } else {
        setClassesLink(data as CompanyLink);
      }
      
      return data as CompanyLink;
    } catch (err) {
      console.error(`Error creating ${type} link:`, err);
      throw err instanceof Error ? err : new Error(`Error al crear el enlace de ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar un link existente
  const deactivateLink = async (linkId: string) => {
    if (!empresa?.id) {
      throw new Error('No hay una empresa seleccionada');
    }

    try {
      setIsLoading(true);
      const supabase = createSupabaseClient();
      console.log('Eliminando link con ID:', linkId);
      
      // Eliminar el registro en lugar de desactivarlo
      const { error } = await supabase
        .from('company_links')
        .delete()
        .eq('id', linkId)
        .eq('empresa_id', empresa.id);

      if (error) throw new Error(error.message);
      
      console.log('Link eliminado exitosamente');
      
      // Refrescar los links después de eliminar
      await fetchCompanyLinks();
      
      return true;
    } catch (err) {
      console.error('Error al eliminar link:', err);
      throw err instanceof Error ? err : new Error('Error al eliminar el enlace');
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar el slug de un link existente
  const updateLinkSlug = async (linkId: string, newSlug: string) => {
    if (!empresa?.id) {
      throw new Error('No hay una empresa seleccionada');
    }

    try {
      setIsLoading(true);
      const supabase = createSupabaseClient();
      console.log('Updating link slug:', { linkId, newSlug });
      
      // Verificar si el slug está disponible
      const { data: existingWithSlug, error: checkError } = await supabase
        .from('company_links')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', linkId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(checkError.message);
      }
      
      if (existingWithSlug) {
        throw new Error('Este slug ya está en uso');
      }
      
      // Actualizar el slug
      const { error } = await supabase
        .from('company_links')
        .update({ slug: newSlug })
        .eq('id', linkId)
        .eq('empresa_id', empresa.id);

      if (error) throw new Error(error.message);
      
      console.log('Link slug updated successfully');
      
      // Refrescar los links después de actualizar
      await fetchCompanyLinks();
      
      return true;
    } catch (err) {
      console.error('Error updating link slug:', err);
      throw err instanceof Error ? err : new Error('Error al actualizar el enlace');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    bookingLink,
    classesLink,
    isLoading: isLoading || isLoadingEmpresa,
    error,
    createBookingLink: () => createLink('bookings'),
    createClassesLink: () => createLink('classes'),
    deactivateBookingLink: bookingLink ? () => deactivateLink(bookingLink.id) : undefined,
    deactivateClassesLink: classesLink ? () => deactivateLink(classesLink.id) : undefined,
    updateBookingLinkSlug: bookingLink ? (newSlug: string) => updateLinkSlug(bookingLink.id, newSlug) : undefined,
    updateClassesLinkSlug: classesLink ? (newSlug: string) => updateLinkSlug(classesLink.id, newSlug) : undefined,
    refreshLinks: fetchCompanyLinks
  };
} 