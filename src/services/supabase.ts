import { createClient } from '@supabase/supabase-js'



import { Member, ReservationStats } from '@/types/database.types'







const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!



const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!







export const supabase = createClient(supabaseUrl, supabaseKey)







export const memberService = {



  // Obtener todos los miembros sin filtrar por sede



  async getMembers() {



    try {



      const { data, error } = await supabase



        .from('members')



        .select(`



          id,



          first_name,



          last_name,



          email,



          phone,



          gender,



          notes,



          status,



          created_at,



          updated_at,



          reservation_stats (



            future_reservations,



            past_reservations,



            cancelled_reservations



          )



        `)



        .order('created_at', { ascending: false })







      if (error) {



        console.error('Error al obtener miembros:', error)



        throw error



      }



      console.log('Miembros obtenidos:', data)



      return data



    } catch (error) {



      console.error('Error en getMembers:', error)



      throw error



    }



  },







  // Crear nuevo miembro sin sede



  async createMember(member: Omit<Member, 'id' | 'created_at' | 'updated_at'>) {



    try {



      const { data, error } = await supabase



        .from('members')



        .insert([{



          first_name: member.first_name,



          last_name: member.last_name,



          email: member.email,



          phone: member.phone || null,



          gender: member.gender || null,



          notes: member.notes || null,



          status: member.status,



          created_at: new Date().toISOString(),



          updated_at: new Date().toISOString()



        }])



        .select(`



          *,



          reservation_stats (



            future_reservations,



            past_reservations,



            cancelled_reservations



          )



        `)



        .single()







      if (error) {



        console.error('Error al crear miembro:', error)



        throw error



      }







      return data



    } catch (error: any) {



      console.error('Error en createMember:', error)



      throw new Error(error.message || 'Error al crear el miembro')



    }



  },







  // Actualizar miembro



  async updateMember(id: string, updates: Partial<Member>) {



    const { data, error } = await supabase



      .from('members')



      .update(updates)



      .eq('id', id)



      .select()



      .single()







    if (error) throw error



    return data



  },







  // Eliminar miembro



  async deleteMember(id: string) {



    const { error } = await supabase



      .from('members')



      .delete()



      .eq('id', id)







    if (error) throw error



    return true



  }



} 


