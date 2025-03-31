import { useQuery } from "@tanstack/react-query";
import { billingService, Invoice } from "@/services/billingService";

// Datos de prueba para mostrar en la interfaz
const MOCK_INVOICES: Invoice[] = [
  {
    id: "1",
    invoice_number: "FAC-2025-001",
    customer_id: "cust_123",
    customer_name: "Juan Pérez",
    date: "2025-03-15",
    due_date: "2025-04-15",
    amount: 120.50,
    status: 'paid',
    branch_id: "branch_1",
    created_at: "2025-03-15T10:30:00Z",
    updated_at: "2025-03-15T10:30:00Z",
    court_type: "Pádel Indoor",
    court_time: "19:00 - 20:30"
  },
  {
    id: "2",
    invoice_number: "FAC-2025-002",
    customer_id: "cust_456",
    customer_name: "María López",
    date: "2025-03-20",
    due_date: "2025-04-20",
    amount: 85.75,
    status: 'pending',
    branch_id: "branch_1",
    created_at: "2025-03-20T14:45:00Z",
    updated_at: "2025-03-20T14:45:00Z",
    court_type: "Pádel Panorámica",
    court_time: "10:00 - 11:30"
  },
  {
    id: "3",
    invoice_number: "FAC-2025-003",
    customer_id: "cust_789",
    customer_name: "Carlos Rodríguez",
    date: "2025-03-10",
    due_date: "2025-03-25",
    amount: 200.00,
    status: 'overdue',
    branch_id: "branch_1",
    created_at: "2025-03-10T09:15:00Z",
    updated_at: "2025-03-10T09:15:00Z",
    court_type: "Tenis Individual",
    court_time: "17:30 - 19:00"
  },
  {
    id: "4",
    invoice_number: "FAC-2025-004",
    customer_id: "cust_321",
    customer_name: "Ana García",
    date: "2025-03-25",
    due_date: "2025-04-25",
    amount: 150.00,
    status: 'deposit',
    branch_id: "branch_1",
    created_at: "2025-03-25T11:20:00Z",
    updated_at: "2025-03-25T11:20:00Z",
    court_type: "Pádel Exterior",
    court_time: "09:00 - 10:30"
  },
  {
    id: "5",
    invoice_number: "FAC-2025-005",
    customer_id: "cust_654",
    customer_name: "Roberto Sánchez",
    date: "2025-03-28",
    due_date: "2025-04-28",
    amount: 300.00,
    status: 'guarantee',
    branch_id: "branch_1",
    created_at: "2025-03-28T16:15:00Z",
    updated_at: "2025-03-28T16:15:00Z",
    court_type: "Pádel Premium",
    court_time: "20:30 - 22:00"
  },
  {
    id: "6",
    invoice_number: "FAC-2025-006",
    customer_id: "cust_987",
    customer_name: "Laura Martínez",
    date: "2025-03-05",
    due_date: "2025-04-05",
    amount: 75.25,
    status: 'cancelled',
    branch_id: "branch_1",
    created_at: "2025-03-05T09:30:00Z",
    updated_at: "2025-03-05T09:30:00Z",
    court_type: "Squash",
    court_time: "18:00 - 19:00"
  },
  {
    id: "7",
    invoice_number: "FAC-2025-007",
    customer_id: "cust_246",
    customer_name: "Javier Morales",
    date: "2025-03-29",
    due_date: "2025-04-29",
    amount: 450.50,
    status: 'paid',
    branch_id: "branch_1",
    created_at: "2025-03-29T13:10:00Z",
    updated_at: "2025-03-30T09:15:00Z",
    court_type: "Pádel Indoor",
    court_time: "16:00 - 17:30"
  },
  {
    id: "8",
    invoice_number: "FAC-2025-008",
    customer_id: "cust_135",
    customer_name: "Silvia Fuentes",
    date: "2025-03-27",
    due_date: "2025-04-10",
    amount: 175.80,
    status: 'deposit',
    branch_id: "branch_1",
    created_at: "2025-03-27T10:45:00Z",
    updated_at: "2025-03-27T10:45:00Z",
    court_type: "Pádel Panorámica",
    court_time: "11:30 - 13:00"
  },
  {
    id: "9",
    invoice_number: "FAC-2025-009",
    customer_id: "cust_357",
    customer_name: "Fernando Ortiz",
    date: "2025-03-15",
    due_date: "2025-03-30",
    amount: 125.00,
    status: 'overdue',
    branch_id: "branch_1",
    created_at: "2025-03-15T14:20:00Z",
    updated_at: "2025-03-15T14:20:00Z",
    court_type: "Tenis Dobles",
    court_time: "15:00 - 16:30"
  },
  {
    id: "10",
    invoice_number: "FAC-2025-010",
    customer_id: "cust_468",
    customer_name: "Patricia Navarro",
    date: "2025-03-30",
    due_date: "2025-04-30",
    amount: 500.00,
    status: 'guarantee',
    branch_id: "branch_1",
    created_at: "2025-03-30T09:00:00Z",
    updated_at: "2025-03-30T09:00:00Z",
    court_type: "Pádel Premium",
    court_time: "19:00 - 20:30"
  },
  {
    id: "11",
    invoice_number: "FAC-2025-011",
    customer_id: "cust_579",
    customer_name: "Gabriela Luna",
    date: "2025-03-12",
    due_date: "2025-04-12",
    amount: 220.30,
    status: 'pending',
    branch_id: "branch_1",
    created_at: "2025-03-12T15:30:00Z",
    updated_at: "2025-03-12T15:30:00Z",
    court_type: "Pádel Exterior",
    court_time: "12:00 - 13:30"
  },
  {
    id: "12",
    invoice_number: "FAC-2025-012",
    customer_id: "cust_680",
    customer_name: "Miguel Ángel Cruz",
    date: "2025-03-01",
    due_date: "2025-04-01",
    amount: 95.60,
    status: 'cancelled',
    branch_id: "branch_1",
    created_at: "2025-03-01T11:25:00Z",
    updated_at: "2025-03-10T08:45:00Z",
    court_type: "Squash",
    court_time: "14:00 - 15:00"
  }
];

interface UseInvoicesOptions {
  branchId?: string;
  onlyActive?: boolean;
}

export function useInvoices({ branchId, onlyActive = true }: UseInvoicesOptions) {
  return useQuery({
    queryKey: ['invoices', branchId],
    queryFn: async () => {
      if (!branchId) {
        return [];
      }

      // Retornamos datos de prueba en lugar de hacer una consulta real
      // Simulamos un pequeño retraso para emular una llamada a la API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const data = MOCK_INVOICES;

      if (onlyActive) {
        return data.filter(invoice => invoice.status !== 'cancelled');
      }

      return data;
    },
    enabled: !!branchId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
