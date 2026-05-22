export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          created_at: string
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          client_id: string | null
          created_at: string
          date: string
          duration_minutes: number
          id: string
          notes: string | null
          price: number | null
          service: string | null
          status: string
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          date: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          price?: number | null
          service?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          price?: number | null
          service?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_date: string | null
          recurrence: string
          status: string
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          recurrence?: string
          status?: string
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          recurrence?: string
          status?: string
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      cash_items: {
        Row: {
          client_id: string | null
          created_at: string
          description: string
          discount: number
          employee_id: string | null
          id: string
          inventory_item_id: string | null
          item_type: string
          payment_method: string | null
          quantity: number
          service_id: string | null
          session_id: string
          subtotal: number
          unit_price: number
          user_id: string
          vertical: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description: string
          discount?: number
          employee_id?: string | null
          id?: string
          inventory_item_id?: string | null
          item_type?: string
          payment_method?: string | null
          quantity?: number
          service_id?: string | null
          session_id: string
          subtotal?: number
          unit_price?: number
          user_id: string
          vertical?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string
          discount?: number
          employee_id?: string | null
          id?: string
          inventory_item_id?: string | null
          item_type?: string
          payment_method?: string | null
          quantity?: number
          service_id?: string | null
          session_id?: string
          subtotal?: number
          unit_price?: number
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          created_at: string
          id: string
          notes: string | null
          opened_at: string
          opening_amount: number
          status: string
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          status?: string
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      clinical_entries: {
        Row: {
          anamnesis: Json | null
          capillary_refill_time: string | null
          chief_complaint: string | null
          client_id: string | null
          complaint_tags: string[] | null
          created_at: string
          diagnosis: string | null
          differential_diagnosis: string | null
          entry_date: string
          general_notes: string | null
          heart_rate: number | null
          id: string
          pet_id: string
          physical_exam: Json | null
          prognosis: string | null
          prognosis_notes: string | null
          respiratory_rate: number | null
          temperature: number | null
          updated_at: string
          user_id: string
          vet_name: string | null
          weight: number | null
        }
        Insert: {
          anamnesis?: Json | null
          capillary_refill_time?: string | null
          chief_complaint?: string | null
          client_id?: string | null
          complaint_tags?: string[] | null
          created_at?: string
          diagnosis?: string | null
          differential_diagnosis?: string | null
          entry_date?: string
          general_notes?: string | null
          heart_rate?: number | null
          id?: string
          pet_id: string
          physical_exam?: Json | null
          prognosis?: string | null
          prognosis_notes?: string | null
          respiratory_rate?: number | null
          temperature?: number | null
          updated_at?: string
          user_id: string
          vet_name?: string | null
          weight?: number | null
        }
        Update: {
          anamnesis?: Json | null
          capillary_refill_time?: string | null
          chief_complaint?: string | null
          client_id?: string | null
          complaint_tags?: string[] | null
          created_at?: string
          diagnosis?: string | null
          differential_diagnosis?: string | null
          entry_date?: string
          general_notes?: string | null
          heart_rate?: number | null
          id?: string
          pet_id?: string
          physical_exam?: Json | null
          prognosis?: string | null
          prognosis_notes?: string | null
          respiratory_rate?: number | null
          temperature?: number | null
          updated_at?: string
          user_id?: string
          vet_name?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_entries_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_records: {
        Row: {
          created_at: string
          date: string
          diagnosis: string | null
          id: string
          observations: string | null
          pet_id: string
          treatment: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          diagnosis?: string | null
          id?: string
          observations?: string | null
          pet_id: string
          treatment?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          diagnosis?: string | null
          id?: string
          observations?: string | null
          pet_id?: string
          treatment?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_records: {
        Row: {
          business_name: string | null
          deleted_at: string
          deleted_by_email: string | null
          deleted_by_name: string | null
          id: string
          purge_at: string
          reason: string | null
          record_data: Json
          record_id: string
          table_name: string
          user_id: string
          vertical: string
        }
        Insert: {
          business_name?: string | null
          deleted_at?: string
          deleted_by_email?: string | null
          deleted_by_name?: string | null
          id?: string
          purge_at?: string
          reason?: string | null
          record_data: Json
          record_id: string
          table_name: string
          user_id: string
          vertical?: string
        }
        Update: {
          business_name?: string | null
          deleted_at?: string
          deleted_by_email?: string | null
          deleted_by_name?: string | null
          id?: string
          purge_at?: string
          reason?: string | null
          record_data?: Json
          record_id?: string
          table_name?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      drug_catalog: {
        Row: {
          active_ingredient: string
          adverse_effects: string | null
          commercial_name: string | null
          contraindications: string | null
          created_at: string
          created_by_name: string | null
          dosage: string | null
          drug_class: string | null
          id: string
          indications: string | null
          interactions: string | null
          is_official: boolean
          name: string
          notes: string | null
          source: string | null
          species: string | null
          updated_at: string
          updated_by_name: string | null
          user_id: string | null
          validation_notes: string | null
          validation_status: string
          withdrawal_period: string | null
        }
        Insert: {
          active_ingredient: string
          adverse_effects?: string | null
          commercial_name?: string | null
          contraindications?: string | null
          created_at?: string
          created_by_name?: string | null
          dosage?: string | null
          drug_class?: string | null
          id?: string
          indications?: string | null
          interactions?: string | null
          is_official?: boolean
          name: string
          notes?: string | null
          source?: string | null
          species?: string | null
          updated_at?: string
          updated_by_name?: string | null
          user_id?: string | null
          validation_notes?: string | null
          validation_status?: string
          withdrawal_period?: string | null
        }
        Update: {
          active_ingredient?: string
          adverse_effects?: string | null
          commercial_name?: string | null
          contraindications?: string | null
          created_at?: string
          created_by_name?: string | null
          dosage?: string | null
          drug_class?: string | null
          id?: string
          indications?: string | null
          interactions?: string | null
          is_official?: boolean
          name?: string
          notes?: string | null
          source?: string | null
          species?: string | null
          updated_at?: string
          updated_by_name?: string | null
          user_id?: string | null
          validation_notes?: string | null
          validation_status?: string
          withdrawal_period?: string | null
        }
        Relationships: []
      }
      drug_favorites: {
        Row: {
          created_at: string
          drug_reference_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drug_reference_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drug_reference_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_favorites_drug_reference_id_fkey"
            columns: ["drug_reference_id"]
            isOneToOne: false
            referencedRelation: "drug_reference"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_reference: {
        Row: {
          active_ingredient: string
          adverse_effects: string | null
          commercial_name: string | null
          concentration_mg_ml: number | null
          contraindications: string | null
          created_at: string
          dosage: string | null
          dose_max_mg_kg: number | null
          dose_min_mg_kg: number | null
          drug_class: string | null
          frequency: string | null
          id: string
          indications: string | null
          interactions: string | null
          name: string
          route: string | null
          species: string | null
          withdrawal_period: string | null
        }
        Insert: {
          active_ingredient: string
          adverse_effects?: string | null
          commercial_name?: string | null
          concentration_mg_ml?: number | null
          contraindications?: string | null
          created_at?: string
          dosage?: string | null
          dose_max_mg_kg?: number | null
          dose_min_mg_kg?: number | null
          drug_class?: string | null
          frequency?: string | null
          id?: string
          indications?: string | null
          interactions?: string | null
          name: string
          route?: string | null
          species?: string | null
          withdrawal_period?: string | null
        }
        Update: {
          active_ingredient?: string
          adverse_effects?: string | null
          commercial_name?: string | null
          concentration_mg_ml?: number | null
          contraindications?: string | null
          created_at?: string
          dosage?: string | null
          dose_max_mg_kg?: number | null
          dose_min_mg_kg?: number | null
          drug_class?: string | null
          frequency?: string | null
          id?: string
          indications?: string | null
          interactions?: string | null
          name?: string
          route?: string | null
          species?: string | null
          withdrawal_period?: string | null
        }
        Relationships: []
      }
      drug_reference_doses: {
        Row: {
          concentration_mg_ml: number | null
          created_at: string
          dose_max_mg_kg: number | null
          dose_min_mg_kg: number | null
          drug_reference_id: string
          frequency: string | null
          id: string
          indication: string | null
          route: string | null
          species: string
        }
        Insert: {
          concentration_mg_ml?: number | null
          created_at?: string
          dose_max_mg_kg?: number | null
          dose_min_mg_kg?: number | null
          drug_reference_id: string
          frequency?: string | null
          id?: string
          indication?: string | null
          route?: string | null
          species: string
        }
        Update: {
          concentration_mg_ml?: number | null
          created_at?: string
          dose_max_mg_kg?: number | null
          dose_min_mg_kg?: number | null
          drug_reference_id?: string
          frequency?: string | null
          id?: string
          indication?: string | null
          route?: string | null
          species?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_reference_doses_drug_reference_id_fkey"
            columns: ["drug_reference_id"]
            isOneToOne: false
            referencedRelation: "drug_reference"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_commissions: {
        Row: {
          amount: number
          appointment_id: string | null
          auto_generated: boolean
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          source_cash_item_id: string | null
          user_id: string
          vertical: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          auto_generated?: boolean
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          source_cash_item_id?: string | null
          user_id: string
          vertical?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          auto_generated?: boolean
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          source_cash_item_id?: string | null
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_commissions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          address: string | null
          app_role: Database["public"]["Enums"]["app_role"] | null
          auth_user_id: string | null
          commission_percent: number
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          salary: number
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          auth_user_id?: string | null
          commission_percent?: number
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          salary?: number
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          auth_user_id?: string | null
          commission_percent?: number
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          salary?: number
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      exam_attachments: {
        Row: {
          created_at: string
          exam_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attachments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "pet_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          appointment_id: string | null
          bill_id: string | null
          cash_session_id: string | null
          category: string | null
          client_id: string | null
          created_at: string
          date: string
          description: string | null
          hospitalization_id: string | null
          id: string
          payment_method: string | null
          type: string
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          bill_id?: string | null
          cash_session_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          hospitalization_id?: string | null
          id?: string
          payment_method?: string | null
          type?: string
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          bill_id?: string | null
          cash_session_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          hospitalization_id?: string | null
          id?: string
          payment_method?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalization_evolutions: {
        Row: {
          content: string | null
          created_at: string
          glycemia: number | null
          heart_rate: number | null
          hospitalization_id: string
          id: string
          pain_level: number | null
          respiratory_rate: number | null
          soap_type: string
          temperature: number | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          glycemia?: number | null
          heart_rate?: number | null
          hospitalization_id: string
          id?: string
          pain_level?: number | null
          respiratory_rate?: number | null
          soap_type?: string
          temperature?: number | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          glycemia?: number | null
          heart_rate?: number | null
          hospitalization_id?: string
          id?: string
          pain_level?: number | null
          respiratory_rate?: number | null
          soap_type?: string
          temperature?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitalization_evolutions_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalization_items: {
        Row: {
          created_at: string
          description: string
          hospitalization_id: string
          id: string
          inventory_item_id: string | null
          item_type: string
          quantity: number
          service_id: string | null
          subtotal: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          hospitalization_id: string
          id?: string
          inventory_item_id?: string | null
          item_type?: string
          quantity?: number
          service_id?: string | null
          subtotal?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          hospitalization_id?: string
          id?: string
          inventory_item_id?: string | null
          item_type?: string
          quantity?: number
          service_id?: string | null
          subtotal?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitalization_items_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalization_medications: {
        Row: {
          administered: boolean
          administered_at: string | null
          created_at: string
          dosage: string | null
          frequency: string | null
          hospitalization_id: string
          id: string
          medication_name: string
          next_dose_at: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          administered?: boolean
          administered_at?: string | null
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          hospitalization_id: string
          id?: string
          medication_name: string
          next_dose_at?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          administered?: boolean
          administered_at?: string | null
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          hospitalization_id?: string
          id?: string
          medication_name?: string
          next_dose_at?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitalization_medications_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalizations: {
        Row: {
          admitted_at: string
          client_id: string | null
          created_at: string
          discharge_notes: string | null
          discharged_at: string | null
          id: string
          pet_id: string
          reason: string
          severity: string
          status: string
          updated_at: string
          user_id: string
          vet_name: string | null
        }
        Insert: {
          admitted_at?: string
          client_id?: string | null
          created_at?: string
          discharge_notes?: string | null
          discharged_at?: string | null
          id?: string
          pet_id: string
          reason: string
          severity?: string
          status?: string
          updated_at?: string
          user_id: string
          vet_name?: string | null
        }
        Update: {
          admitted_at?: string
          client_id?: string | null
          created_at?: string
          discharge_notes?: string | null
          discharged_at?: string | null
          id?: string
          pet_id?: string
          reason?: string
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
          vet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitalizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalizations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch: string | null
          created_at: string
          expiry_date: string | null
          id: string
          item_id: string
          quantity: number
          unit_cost: number | null
          user_id: string
          vertical: string
        }
        Insert: {
          batch?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id: string
          quantity?: number
          unit_cost?: number | null
          user_id: string
          vertical?: string
        }
        Update: {
          batch?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id?: string
          quantity?: number
          unit_cost?: number | null
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          active_ingredient: string | null
          administration_route: string | null
          barcode: string | null
          batch: string | null
          brand: string | null
          category: string
          commission_type: string
          commission_value: number
          composition: string | null
          concentration: string | null
          cost_price: number | null
          created_at: string
          doses_per_vial: number | null
          drug_catalog_id: string | null
          expiry_date: string | null
          extra_fields: Json
          id: string
          indication: string | null
          location: string | null
          manufacturer: string | null
          material_type: string | null
          min_quantity: number
          name: string
          notes: string | null
          opened_at: string | null
          pharmaceutical_form: string | null
          prescription_required: boolean
          presentation: string | null
          quantity: number
          sell_price: number | null
          sku: string | null
          special_control: boolean
          species: string | null
          sterilization_required: boolean
          storage_temperature: string | null
          subcategory: string | null
          supplier: string | null
          supplier_id: string | null
          unit: string
          updated_at: string
          user_id: string
          vaccine_type: string | null
          vertical: string
          weight_volume: string | null
        }
        Insert: {
          active_ingredient?: string | null
          administration_route?: string | null
          barcode?: string | null
          batch?: string | null
          brand?: string | null
          category?: string
          commission_type?: string
          commission_value?: number
          composition?: string | null
          concentration?: string | null
          cost_price?: number | null
          created_at?: string
          doses_per_vial?: number | null
          drug_catalog_id?: string | null
          expiry_date?: string | null
          extra_fields?: Json
          id?: string
          indication?: string | null
          location?: string | null
          manufacturer?: string | null
          material_type?: string | null
          min_quantity?: number
          name: string
          notes?: string | null
          opened_at?: string | null
          pharmaceutical_form?: string | null
          prescription_required?: boolean
          presentation?: string | null
          quantity?: number
          sell_price?: number | null
          sku?: string | null
          special_control?: boolean
          species?: string | null
          sterilization_required?: boolean
          storage_temperature?: string | null
          subcategory?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          user_id: string
          vaccine_type?: string | null
          vertical?: string
          weight_volume?: string | null
        }
        Update: {
          active_ingredient?: string | null
          administration_route?: string | null
          barcode?: string | null
          batch?: string | null
          brand?: string | null
          category?: string
          commission_type?: string
          commission_value?: number
          composition?: string | null
          concentration?: string | null
          cost_price?: number | null
          created_at?: string
          doses_per_vial?: number | null
          drug_catalog_id?: string | null
          expiry_date?: string | null
          extra_fields?: Json
          id?: string
          indication?: string | null
          location?: string | null
          manufacturer?: string | null
          material_type?: string | null
          min_quantity?: number
          name?: string
          notes?: string | null
          opened_at?: string | null
          pharmaceutical_form?: string | null
          prescription_required?: boolean
          presentation?: string | null
          quantity?: number
          sell_price?: number | null
          sku?: string | null
          special_control?: boolean
          species?: string | null
          sterilization_required?: boolean
          storage_temperature?: string | null
          subcategory?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
          vaccine_type?: string | null
          vertical?: string
          weight_volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_drug_catalog_id_fkey"
            columns: ["drug_catalog_id"]
            isOneToOne: false
            referencedRelation: "drug_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          performed_by: string | null
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          type: string
          unit_cost: number | null
          user_id: string
          vertical: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          performed_by?: string | null
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          unit_cost?: number | null
          user_id: string
          vertical?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          performed_by?: string | null
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          unit_cost?: number | null
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_items: {
        Row: {
          carb_g: number | null
          created_at: string
          fat_g: number | null
          food: string
          id: string
          kcal: number | null
          meal_name: string
          meal_plan_id: string
          meal_time: string | null
          ord: number
          protein_g: number | null
          quantity: string | null
          user_id: string
        }
        Insert: {
          carb_g?: number | null
          created_at?: string
          fat_g?: number | null
          food: string
          id?: string
          kcal?: number | null
          meal_name: string
          meal_plan_id: string
          meal_time?: string | null
          ord?: number
          protein_g?: number | null
          quantity?: string | null
          user_id: string
        }
        Update: {
          carb_g?: number | null
          created_at?: string
          fat_g?: number | null
          food?: string
          id?: string
          kcal?: number | null
          meal_name?: string
          meal_plan_id?: string
          meal_time?: string | null
          ord?: number
          protein_g?: number | null
          quantity?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          items: Json
          title: string
          total_carb_g: number | null
          total_fat_g: number | null
          total_kcal: number | null
          total_protein_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          title: string
          total_carb_g?: number | null
          total_fat_g?: number | null
          total_kcal?: number | null
          total_protein_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          title?: string
          total_carb_g?: number | null
          total_fat_g?: number | null
          total_kcal?: number | null
          total_protein_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string
          end_date: string | null
          generated_by_ai: boolean
          id: string
          notes: string | null
          patient_id: string
          start_date: string | null
          title: string
          total_carb_g: number | null
          total_fat_g: number | null
          total_kcal: number | null
          total_protein_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          generated_by_ai?: boolean
          id?: string
          notes?: string | null
          patient_id: string
          start_date?: string | null
          title: string
          total_carb_g?: number | null
          total_fat_g?: number | null
          total_kcal?: number | null
          total_protein_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          generated_by_ai?: boolean
          id?: string
          notes?: string | null
          patient_id?: string
          start_date?: string | null
          title?: string
          total_carb_g?: number | null
          total_fat_g?: number | null
          total_kcal?: number | null
          total_protein_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      nursing_checks: {
        Row: {
          check_type: string
          completed_at: string | null
          created_at: string
          description: string | null
          hospitalization_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          check_type: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          hospitalization_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          check_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          hospitalization_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nursing_checks_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nutri_anamnesis: {
        Row: {
          created_at: string
          data: Json
          entry_date: string
          id: string
          notes: string | null
          patient_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          entry_date?: string
          id?: string
          notes?: string | null
          patient_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          entry_date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutri_anamnesis_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_assessments: {
        Row: {
          abdominal_cm: number | null
          activity_level: string | null
          arm_cm: number | null
          assessment_date: string
          bioimpedance: Json
          bmi: number | null
          body_fat_percent: number | null
          calf_cm: number | null
          chest_cm: number | null
          created_at: string
          height_cm: number | null
          id: string
          lean_mass_kg: number | null
          measurements: Json
          neck_cm: number | null
          notes: string | null
          patient_id: string
          photos: Json
          skinfolds: Json | null
          target_carb_g: number | null
          target_fat_g: number | null
          target_kcal: number | null
          target_protein_g: number | null
          thigh_cm: number | null
          tmb_kcal: number | null
          updated_at: string
          user_id: string
          vet_kcal: number | null
          weight_kg: number | null
        }
        Insert: {
          abdominal_cm?: number | null
          activity_level?: string | null
          arm_cm?: number | null
          assessment_date?: string
          bioimpedance?: Json
          bmi?: number | null
          body_fat_percent?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          lean_mass_kg?: number | null
          measurements?: Json
          neck_cm?: number | null
          notes?: string | null
          patient_id: string
          photos?: Json
          skinfolds?: Json | null
          target_carb_g?: number | null
          target_fat_g?: number | null
          target_kcal?: number | null
          target_protein_g?: number | null
          thigh_cm?: number | null
          tmb_kcal?: number | null
          updated_at?: string
          user_id: string
          vet_kcal?: number | null
          weight_kg?: number | null
        }
        Update: {
          abdominal_cm?: number | null
          activity_level?: string | null
          arm_cm?: number | null
          assessment_date?: string
          bioimpedance?: Json
          bmi?: number | null
          body_fat_percent?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          lean_mass_kg?: number | null
          measurements?: Json
          neck_cm?: number | null
          notes?: string | null
          patient_id?: string
          photos?: Json
          skinfolds?: Json | null
          target_carb_g?: number | null
          target_fat_g?: number | null
          target_kcal?: number | null
          target_protein_g?: number | null
          thigh_cm?: number | null
          tmb_kcal?: number | null
          updated_at?: string
          user_id?: string
          vet_kcal?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: string | null
          birth_date: string | null
          client_id: string | null
          created_at: string
          dietary_restrictions: string | null
          goal: string | null
          id: string
          medical_conditions: string | null
          name: string
          notes: string | null
          sex: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          birth_date?: string | null
          client_id?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          goal?: string | null
          id?: string
          medical_conditions?: string | null
          name: string
          notes?: string | null
          sex?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          birth_date?: string | null
          client_id?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          goal?: string | null
          id?: string
          medical_conditions?: string | null
          name?: string
          notes?: string | null
          sex?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_attachments: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          pet_id: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          pet_id: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          pet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_attachments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_exams: {
        Row: {
          created_at: string
          date: string
          exam_type: string
          id: string
          observations: string | null
          pet_id: string
          result: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          exam_type: string
          id?: string
          observations?: string | null
          pet_id: string
          result?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          exam_type?: string
          id?: string
          observations?: string | null
          pet_id?: string
          result?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_exams_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          pet_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          pet_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          pet_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_notes_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_presale_items: {
        Row: {
          created_at: string
          description: string
          discount: number
          id: string
          inventory_item_id: string | null
          item_type: string
          presale_id: string
          quantity: number
          service_id: string | null
          subtotal: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          discount?: number
          id?: string
          inventory_item_id?: string | null
          item_type?: string
          presale_id: string
          quantity?: number
          service_id?: string | null
          subtotal?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          discount?: number
          id?: string
          inventory_item_id?: string | null
          item_type?: string
          presale_id?: string
          quantity?: number
          service_id?: string | null
          subtotal?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_presale_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_presale_items_presale_id_fkey"
            columns: ["presale_id"]
            isOneToOne: false
            referencedRelation: "pet_presales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_presale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_presales: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          pet_id: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pet_id: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pet_id?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_presales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_presales_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_vaccines: {
        Row: {
          application_date: string
          batch: string | null
          created_at: string
          id: string
          next_dose_date: string | null
          observations: string | null
          pet_id: string
          updated_at: string
          user_id: string
          vaccine_name: string
        }
        Insert: {
          application_date?: string
          batch?: string | null
          created_at?: string
          id?: string
          next_dose_date?: string | null
          observations?: string | null
          pet_id: string
          updated_at?: string
          user_id: string
          vaccine_name: string
        }
        Update: {
          application_date?: string
          batch?: string | null
          created_at?: string
          id?: string
          next_dose_date?: string | null
          observations?: string | null
          pet_id?: string
          updated_at?: string
          user_id?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_vaccines_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_weights: {
        Row: {
          created_at: string
          date: string
          id: string
          pet_id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          pet_id: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          pet_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_weights_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          birth_date: string | null
          breed: string | null
          client_id: string | null
          coat: string | null
          color: string | null
          created_at: string
          death_date: string | null
          id: string
          microchip: string | null
          name: string
          neutered: boolean | null
          notes: string | null
          photo_url: string | null
          restrictions: string | null
          sex: string | null
          species: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          client_id?: string | null
          coat?: string | null
          color?: string | null
          created_at?: string
          death_date?: string | null
          id?: string
          microchip?: string | null
          name: string
          neutered?: boolean | null
          notes?: string | null
          photo_url?: string | null
          restrictions?: string | null
          sex?: string | null
          species?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          client_id?: string | null
          coat?: string | null
          color?: string | null
          created_at?: string
          death_date?: string | null
          id?: string
          microchip?: string | null
          name?: string
          neutered?: boolean | null
          notes?: string | null
          photo_url?: string | null
          restrictions?: string | null
          sex?: string | null
          species?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admin_audit: {
        Row: {
          acting_as: string | null
          action: string
          admin_id: string
          created_at: string
          id: string
          payload: Json | null
          record_count: number | null
          table_name: string | null
        }
        Insert: {
          acting_as?: string | null
          action: string
          admin_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          record_count?: number | null
          table_name?: string | null
        }
        Update: {
          acting_as?: string | null
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          record_count?: number | null
          table_name?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          email: string
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          email: string
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          email?: string
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          date: string
          dosage: string | null
          form: string | null
          id: string
          medications: Json
          observations: string | null
          pet_id: string
          prescription: string
          prescription_type: string
          route: string | null
          show_date: boolean
          sipeagro_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          dosage?: string | null
          form?: string | null
          id?: string
          medications?: Json
          observations?: string | null
          pet_id: string
          prescription: string
          prescription_type?: string
          route?: string | null
          show_date?: boolean
          sipeagro_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          dosage?: string | null
          form?: string | null
          id?: string
          medications?: Json
          observations?: string | null
          pet_id?: string
          prescription?: string
          prescription_type?: string
          route?: string | null
          show_date?: boolean
          sipeagro_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_address: string | null
          business_cnpj: string | null
          business_ie: string | null
          business_name: string | null
          business_phone: string | null
          business_type: string | null
          cpf: string | null
          created_at: string
          crmv: string | null
          display_name: string | null
          id: string
          logo_url: string | null
          phone: string | null
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          business_address?: string | null
          business_cnpj?: string | null
          business_ie?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          cpf?: string | null
          created_at?: string
          crmv?: string | null
          display_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          business_address?: string | null
          business_cnpj?: string | null
          business_ie?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          cpf?: string | null
          created_at?: string
          crmv?: string | null
          display_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          batch_id: string | null
          coupon_code: string | null
          created_at: string
          discount_percent: number
          end_date: string
          id: string
          item_id: string
          notes: string | null
          original_price: number
          promo_price: number
          start_date: string
          status: string
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          batch_id?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_percent?: number
          end_date: string
          id?: string
          item_id: string
          notes?: string | null
          original_price?: number
          promo_price?: number
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          batch_id?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_percent?: number
          end_date?: string
          id?: string
          item_id?: string
          notes?: string | null
          original_price?: number
          promo_price?: number
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          reminder_id: string
          status: string
          user_id: string
          vertical: string
        }
        Insert: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          reminder_id: string
          status?: string
          user_id: string
          vertical?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          reminder_id?: string
          status?: string
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          advance_days: number
          channel: string
          client_id: string | null
          created_at: string
          id: string
          message: string | null
          pet_id: string | null
          reminder_type: string
          scheduled_date: string
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          advance_days?: number
          channel?: string
          client_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          pet_id?: string | null
          reminder_type?: string
          scheduled_date: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          advance_days?: number
          channel?: string
          client_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          pet_id?: string | null
          reminder_type?: string
          scheduled_date?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          batch: string | null
          category: string | null
          commission_type: string
          commission_value: number
          cost_price: number
          created_at: string
          description: string | null
          duration_minutes: number | null
          expiry_date: string | null
          id: string
          min_stock: number | null
          name: string
          price: number
          stock_quantity: number | null
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          active?: boolean
          batch?: string | null
          category?: string | null
          commission_type?: string
          commission_value?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          expiry_date?: string | null
          id?: string
          min_stock?: number | null
          name: string
          price?: number
          stock_quantity?: number | null
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          active?: boolean
          batch?: string | null
          category?: string | null
          commission_type?: string
          commission_value?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          expiry_date?: string | null
          id?: string
          min_stock?: number | null
          name?: string
          price?: number
          stock_quantity?: number | null
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          payment_provider: string | null
          plan_id: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          trial_ends_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          payment_provider?: string | null
          plan_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          payment_provider?: string | null
          plan_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          ie: string | null
          legal_type: string
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          phone2: string | null
          seller_email: string | null
          seller_name: string | null
          seller_phone: string | null
          state: string | null
          street: string | null
          trade_name: string | null
          updated_at: string
          user_id: string
          vertical: string
          website: string | null
        }
        Insert: {
          active?: boolean
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          ie?: string | null
          legal_type?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          phone2?: string | null
          seller_email?: string | null
          seller_name?: string | null
          seller_phone?: string | null
          state?: string | null
          street?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id: string
          vertical?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          ie?: string | null
          legal_type?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          phone2?: string | null
          seller_email?: string | null
          seller_name?: string | null
          seller_phone?: string | null
          state?: string | null
          street?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id?: string
          vertical?: string
          website?: string | null
        }
        Relationships: []
      }
      treatment_items: {
        Row: {
          clinical_entry_id: string
          created_at: string
          dose: number | null
          dose_unit: string | null
          duration_days: number | null
          frequency: string | null
          id: string
          medication_name: string
          notes: string | null
          route: string | null
          user_id: string
        }
        Insert: {
          clinical_entry_id: string
          created_at?: string
          dose?: number | null
          dose_unit?: string | null
          duration_days?: number | null
          frequency?: string | null
          id?: string
          medication_name: string
          notes?: string | null
          route?: string | null
          user_id: string
        }
        Update: {
          clinical_entry_id?: string
          created_at?: string
          dose?: number | null
          dose_unit?: string | null
          duration_days?: number | null
          frequency?: string | null
          id?: string
          medication_name?: string
          notes?: string | null
          route?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_items_clinical_entry_id_fkey"
            columns: ["clinical_entry_id"]
            isOneToOne: false
            referencedRelation: "clinical_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_permissions: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_verticals: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vertical: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vertical: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      vet_documents: {
        Row: {
          client_id: string | null
          created_at: string
          data: Json
          document_number: number
          document_type: string
          id: string
          pet_id: string | null
          user_id: string
          vertical: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          data?: Json
          document_number?: number
          document_type: string
          id?: string
          pet_id?: string | null
          user_id: string
          vertical?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          data?: Json
          document_number?: number
          document_type?: string
          id?: string
          pet_id?: string | null
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_documents_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_vertical_to_account: { Args: { p_vertical: string }; Returns: Json }
      admin_set_user_verticals: {
        Args: { p_user_id: string; p_verticals: string[] }
        Returns: Json
      }
      ai_usage_current_month: { Args: { p_user_id: string }; Returns: number }
      check_signup_duplicate:
        | { Args: { p_cpf: string; p_email: string }; Returns: Json }
        | {
            Args: { p_cpf: string; p_email: string; p_phone?: string }
            Returns: Json
          }
        | {
            Args: {
              p_cpf: string
              p_email: string
              p_phone?: string
              p_vertical?: string
            }
            Returns: Json
          }
      current_owner_id: { Args: never; Returns: string }
      current_user_vertical: { Args: never; Returns: string }
      decrement_stock: {
        Args: { p_item_id: string; p_qty: number }
        Returns: boolean
      }
      get_expiring_items: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          batch: string
          days_until_expiry: number
          expiry_date: string
          id: string
          location: string
          name: string
          quantity: number
        }[]
      }
      get_low_stock_items: {
        Args: { p_user_id: string }
        Returns: {
          category: string
          id: string
          location: string
          min_quantity: number
          name: string
          quantity: number
        }[]
      }
      get_team_subscription: {
        Args: { p_owner: string }
        Returns: {
          current_period_end: string
          payment_provider: string
          plan_id: string
          status: string
          trial_ends_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_stock: {
        Args: { p_item_id: string; p_qty: number }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_team_member: { Args: { _owner: string }; Returns: boolean }
      purge_expired_deleted_records: { Args: never; Returns: number }
      set_active_vertical: { Args: { p_vertical: string }; Returns: Json }
      team_role_for: {
        Args: { _owner: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "owner" | "vet" | "receptionist" | "stockist"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "vet", "receptionist", "stockist"],
    },
  },
} as const
