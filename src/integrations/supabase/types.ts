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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agm_action_plans: {
        Row: {
          acao: string
          ai_generated: boolean
          causa: string
          como: string
          created_at: string
          farol: string
          fenomeno: string
          id: string
          indicador: string
          mes_referencia: string
          prazo_final: string
          prazo_inicial: string
          responsavel: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acao?: string
          ai_generated?: boolean
          causa?: string
          como?: string
          created_at?: string
          farol?: string
          fenomeno?: string
          id?: string
          indicador?: string
          mes_referencia?: string
          prazo_final?: string
          prazo_inicial?: string
          responsavel?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acao?: string
          ai_generated?: boolean
          causa?: string
          como?: string
          created_at?: string
          farol?: string
          fenomeno?: string
          id?: string
          indicador?: string
          mes_referencia?: string
          prazo_final?: string
          prazo_inicial?: string
          responsavel?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agm_entries: {
        Row: {
          created_at: string
          detalhes: Json
          id: string
          indicador: string
          mes_referencia: string
          meta_valor: string
          observacoes: string
          realizado_valor: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json
          id?: string
          indicador?: string
          mes_referencia?: string
          meta_valor?: string
          observacoes?: string
          realizado_valor?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detalhes?: Json
          id?: string
          indicador?: string
          mes_referencia?: string
          meta_valor?: string
          observacoes?: string
          realizado_valor?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analyst_goals: {
        Row: {
          analyst_name: string
          created_at: string
          id: string
          indicador: string
          metas_mensais: Json
          peso: number
          polaridade: string
          realizados_mensais: Json
          updated_at: string
          user_id: string
          valor_ano: string
        }
        Insert: {
          analyst_name: string
          created_at?: string
          id?: string
          indicador: string
          metas_mensais?: Json
          peso?: number
          polaridade?: string
          realizados_mensais?: Json
          updated_at?: string
          user_id: string
          valor_ano?: string
        }
        Update: {
          analyst_name?: string
          created_at?: string
          id?: string
          indicador?: string
          metas_mensais?: Json
          peso?: number
          polaridade?: string
          realizados_mensais?: Json
          updated_at?: string
          user_id?: string
          valor_ano?: string
        }
        Relationships: []
      }
      authorized_team_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      construction_diary: {
        Row: {
          created_at: string
          description: string
          entry_date: string
          id: string
          store_id: string
          updated_at: string
          user_id: string
          weather: string | null
          workers_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string
          entry_date?: string
          id?: string
          store_id: string
          updated_at?: string
          user_id: string
          weather?: string | null
          workers_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          entry_date?: string
          id?: string
          store_id?: string
          updated_at?: string
          user_id?: string
          weather?: string | null
          workers_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_diary_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_geral_entries: {
        Row: {
          ano: number
          area_loja: number
          area_total: number
          created_at: string
          demais_itens: number
          estado: string
          id: string
          iluminacao: number
          informatica: number
          local: string
          mao_de_obra: number
          moveis: number
          nome: string
          piso: number
          prazo: string
          regional: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ano?: number
          area_loja?: number
          area_total?: number
          created_at?: string
          demais_itens?: number
          estado?: string
          id?: string
          iluminacao?: number
          informatica?: number
          local?: string
          mao_de_obra?: number
          moveis?: number
          nome: string
          piso?: number
          prazo?: string
          regional?: string
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: number
          area_loja?: number
          area_total?: number
          created_at?: string
          demais_itens?: number
          estado?: string
          id?: string
          iluminacao?: number
          informatica?: number
          local?: string
          mao_de_obra?: number
          moveis?: number
          nome?: string
          piso?: number
          prazo?: string
          regional?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diary_photos: {
        Row: {
          caption: string | null
          created_at: string
          diary_id: string
          id: string
          photo_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          diary_id: string
          id?: string
          photo_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          diary_id?: string
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_photos_diary_id_fkey"
            columns: ["diary_id"]
            isOneToOne: false
            referencedRelation: "construction_diary"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores_homologados: {
        Row: {
          contato: string
          created_at: string
          email: string
          empresa: string
          id: string
          produto: string
          telefone: string
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          contato?: string
          created_at?: string
          email?: string
          empresa?: string
          id?: string
          produto?: string
          telefone?: string
          updated_at?: string
          user_id: string
          whatsapp?: string
        }
        Update: {
          contato?: string
          created_at?: string
          email?: string
          empresa?: string
          id?: string
          produto?: string
          telefone?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      fornecedores_prospeccao: {
        Row: {
          analista_responsavel: string
          avaliacao: number
          contato: string
          created_at: string
          email: string
          id: string
          mes_referencia: string
          nome_empresa: string
          observacoes: string
          produto_servico: string
          proposta_url: string
          status: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analista_responsavel?: string
          avaliacao?: number
          contato?: string
          created_at?: string
          email?: string
          id?: string
          mes_referencia?: string
          nome_empresa: string
          observacoes?: string
          produto_servico?: string
          proposta_url?: string
          status?: string
          telefone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analista_responsavel?: string
          avaliacao?: number
          contato?: string
          created_at?: string
          email?: string
          id?: string
          mes_referencia?: string
          nome_empresa?: string
          observacoes?: string
          produto_servico?: string
          proposta_url?: string
          status?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      franchisee_access: {
        Row: {
          access_type: string
          can_edit_checklist: boolean
          can_edit_cronograma: boolean
          can_edit_custos: boolean
          can_edit_diario: boolean
          can_view_checklist: boolean
          can_view_cronograma: boolean
          can_view_custos: boolean
          can_view_diario: boolean
          created_at: string
          created_by: string
          franchisee_email: string
          id: string
          store_id: string
        }
        Insert: {
          access_type?: string
          can_edit_checklist?: boolean
          can_edit_cronograma?: boolean
          can_edit_custos?: boolean
          can_edit_diario?: boolean
          can_view_checklist?: boolean
          can_view_cronograma?: boolean
          can_view_custos?: boolean
          can_view_diario?: boolean
          created_at?: string
          created_by: string
          franchisee_email: string
          id?: string
          store_id: string
        }
        Update: {
          access_type?: string
          can_edit_checklist?: boolean
          can_edit_cronograma?: boolean
          can_edit_custos?: boolean
          can_edit_diario?: boolean
          can_view_checklist?: boolean
          can_view_cronograma?: boolean
          can_view_custos?: boolean
          can_view_diario?: boolean
          created_at?: string
          created_by?: string
          franchisee_email?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchisee_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          completed: boolean
          completion_date: string
          created_at: string
          habit_id: string
          id: string
          team_member_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completion_date?: string
          created_at?: string
          habit_id: string
          id?: string
          team_member_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completion_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          team_member_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_completions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          assigned_to_members: string[]
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          assigned_to_members?: string[]
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          assigned_to_members?: string[]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_stores: {
        Row: {
          analista_obra: string
          cd_origem: string
          cidade: string
          contato_franqueado: string
          contratos: string
          created_at: string
          data_inauguracao: string
          data_liberacao_orcamento: string
          email_franqueado: string
          estado: string
          filial: string
          franqueado: string
          id: string
          inicio_contratos: string
          inicio_obra: string
          inicio_orcamento_obra: string
          inicio_projeto_ar_condicionado: string
          inicio_projeto_arquitetonico: string
          inicio_projeto_eletrico: string
          inicio_projeto_estrutural: string
          inicio_projeto_incendio: string
          local: string
          localizacao: string
          observacoes: string
          orcamento_obra: string
          padrao: string
          prazo_conclusao_orcamento: string
          prazo_contratos: string
          prazo_orcamento_obra: string
          prazo_projeto_ar_condicionado: string
          prazo_projeto_arquitetonico: string
          prazo_projeto_eletrico: string
          prazo_projeto_estrutural: string
          prazo_projeto_incendio: string
          previsao_inauguracao: string
          projeto_ar_condicionado: string
          projeto_arquitetonico: string
          projeto_eletrico: string
          projeto_estrutural: string
          projeto_incendio: string
          status_geral: string
          transferido: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          analista_obra?: string
          cd_origem?: string
          cidade?: string
          contato_franqueado?: string
          contratos?: string
          created_at?: string
          data_inauguracao?: string
          data_liberacao_orcamento?: string
          email_franqueado?: string
          estado?: string
          filial?: string
          franqueado?: string
          id?: string
          inicio_contratos?: string
          inicio_obra?: string
          inicio_orcamento_obra?: string
          inicio_projeto_ar_condicionado?: string
          inicio_projeto_arquitetonico?: string
          inicio_projeto_eletrico?: string
          inicio_projeto_estrutural?: string
          inicio_projeto_incendio?: string
          local?: string
          localizacao?: string
          observacoes?: string
          orcamento_obra?: string
          padrao?: string
          prazo_conclusao_orcamento?: string
          prazo_contratos?: string
          prazo_orcamento_obra?: string
          prazo_projeto_ar_condicionado?: string
          prazo_projeto_arquitetonico?: string
          prazo_projeto_eletrico?: string
          prazo_projeto_estrutural?: string
          prazo_projeto_incendio?: string
          previsao_inauguracao?: string
          projeto_ar_condicionado?: string
          projeto_arquitetonico?: string
          projeto_eletrico?: string
          projeto_estrutural?: string
          projeto_incendio?: string
          status_geral?: string
          transferido?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          analista_obra?: string
          cd_origem?: string
          cidade?: string
          contato_franqueado?: string
          contratos?: string
          created_at?: string
          data_inauguracao?: string
          data_liberacao_orcamento?: string
          email_franqueado?: string
          estado?: string
          filial?: string
          franqueado?: string
          id?: string
          inicio_contratos?: string
          inicio_obra?: string
          inicio_orcamento_obra?: string
          inicio_projeto_ar_condicionado?: string
          inicio_projeto_arquitetonico?: string
          inicio_projeto_eletrico?: string
          inicio_projeto_estrutural?: string
          inicio_projeto_incendio?: string
          local?: string
          localizacao?: string
          observacoes?: string
          orcamento_obra?: string
          padrao?: string
          prazo_conclusao_orcamento?: string
          prazo_contratos?: string
          prazo_orcamento_obra?: string
          prazo_projeto_ar_condicionado?: string
          prazo_projeto_arquitetonico?: string
          prazo_projeto_eletrico?: string
          prazo_projeto_estrutural?: string
          prazo_projeto_incendio?: string
          previsao_inauguracao?: string
          projeto_ar_condicionado?: string
          projeto_arquitetonico?: string
          projeto_eletrico?: string
          projeto_estrutural?: string
          projeto_incendio?: string
          status_geral?: string
          transferido?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          analista_obra: string
          checklist: Json
          construtor: string
          created_at: string
          cronograma: Json
          custos: Json
          filial: string
          franqueado: string
          id: string
          inauguracao: string
          inauguracao_checklist: Json
          nome: string
          solicitacoes: Json
          tipo_loja: string
          updated_at: string
          user_id: string
          visita_tecnica: Json
        }
        Insert: {
          analista_obra?: string
          checklist?: Json
          construtor?: string
          created_at?: string
          cronograma?: Json
          custos?: Json
          filial?: string
          franqueado?: string
          id?: string
          inauguracao?: string
          inauguracao_checklist?: Json
          nome: string
          solicitacoes?: Json
          tipo_loja?: string
          updated_at?: string
          user_id: string
          visita_tecnica?: Json
        }
        Update: {
          analista_obra?: string
          checklist?: Json
          construtor?: string
          created_at?: string
          cronograma?: Json
          custos?: Json
          filial?: string
          franqueado?: string
          id?: string
          inauguracao?: string
          inauguracao_checklist?: Json
          nome?: string
          solicitacoes?: Json
          tipo_loja?: string
          updated_at?: string
          user_id?: string
          visita_tecnica?: Json
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_events: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          store_name: string | null
          team_member_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string
          id?: string
          store_name?: string | null
          team_member_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          store_name?: string | null
          team_member_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_events_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      pipeline_stores_public: {
        Row: {
          analista_obra: string | null
          cd_origem: string | null
          cidade: string | null
          contratos: string | null
          created_at: string | null
          data_inauguracao: string | null
          data_liberacao_orcamento: string | null
          estado: string | null
          filial: string | null
          franqueado: string | null
          id: string | null
          inicio_contratos: string | null
          inicio_obra: string | null
          inicio_orcamento_obra: string | null
          inicio_projeto_ar_condicionado: string | null
          inicio_projeto_arquitetonico: string | null
          inicio_projeto_eletrico: string | null
          inicio_projeto_estrutural: string | null
          inicio_projeto_incendio: string | null
          local: string | null
          localizacao: string | null
          observacoes: string | null
          orcamento_obra: string | null
          padrao: string | null
          prazo_conclusao_orcamento: string | null
          prazo_contratos: string | null
          prazo_orcamento_obra: string | null
          prazo_projeto_ar_condicionado: string | null
          prazo_projeto_arquitetonico: string | null
          prazo_projeto_eletrico: string | null
          prazo_projeto_estrutural: string | null
          prazo_projeto_incendio: string | null
          previsao_inauguracao: string | null
          projeto_ar_condicionado: string | null
          projeto_arquitetonico: string | null
          projeto_eletrico: string | null
          projeto_estrutural: string | null
          projeto_incendio: string | null
          status_geral: string | null
          transferido: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analista_obra?: string | null
          cd_origem?: string | null
          cidade?: string | null
          contratos?: string | null
          created_at?: string | null
          data_inauguracao?: string | null
          data_liberacao_orcamento?: string | null
          estado?: string | null
          filial?: string | null
          franqueado?: string | null
          id?: string | null
          inicio_contratos?: string | null
          inicio_obra?: string | null
          inicio_orcamento_obra?: string | null
          inicio_projeto_ar_condicionado?: string | null
          inicio_projeto_arquitetonico?: string | null
          inicio_projeto_eletrico?: string | null
          inicio_projeto_estrutural?: string | null
          inicio_projeto_incendio?: string | null
          local?: string | null
          localizacao?: string | null
          observacoes?: string | null
          orcamento_obra?: string | null
          padrao?: string | null
          prazo_conclusao_orcamento?: string | null
          prazo_contratos?: string | null
          prazo_orcamento_obra?: string | null
          prazo_projeto_ar_condicionado?: string | null
          prazo_projeto_arquitetonico?: string | null
          prazo_projeto_eletrico?: string | null
          prazo_projeto_estrutural?: string | null
          prazo_projeto_incendio?: string | null
          previsao_inauguracao?: string | null
          projeto_ar_condicionado?: string | null
          projeto_arquitetonico?: string | null
          projeto_eletrico?: string | null
          projeto_estrutural?: string | null
          projeto_incendio?: string | null
          status_geral?: string | null
          transferido?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analista_obra?: string | null
          cd_origem?: string | null
          cidade?: string | null
          contratos?: string | null
          created_at?: string | null
          data_inauguracao?: string | null
          data_liberacao_orcamento?: string | null
          estado?: string | null
          filial?: string | null
          franqueado?: string | null
          id?: string | null
          inicio_contratos?: string | null
          inicio_obra?: string | null
          inicio_orcamento_obra?: string | null
          inicio_projeto_ar_condicionado?: string | null
          inicio_projeto_arquitetonico?: string | null
          inicio_projeto_eletrico?: string | null
          inicio_projeto_estrutural?: string | null
          inicio_projeto_incendio?: string | null
          local?: string | null
          localizacao?: string | null
          observacoes?: string | null
          orcamento_obra?: string | null
          padrao?: string | null
          prazo_conclusao_orcamento?: string | null
          prazo_contratos?: string | null
          prazo_orcamento_obra?: string | null
          prazo_projeto_ar_condicionado?: string | null
          prazo_projeto_arquitetonico?: string | null
          prazo_projeto_eletrico?: string | null
          prazo_projeto_estrutural?: string | null
          prazo_projeto_incendio?: string | null
          previsao_inauguracao?: string | null
          projeto_ar_condicionado?: string | null
          projeto_arquitetonico?: string | null
          projeto_eletrico?: string | null
          projeto_estrutural?: string | null
          projeto_incendio?: string | null
          status_geral?: string | null
          transferido?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_authorized_team: { Args: { check_user_id: string }; Returns: boolean }
    }
    Enums: {
      task_priority: "baixa" | "media" | "alta" | "urgente"
      task_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
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
      task_priority: ["baixa", "media", "alta", "urgente"],
      task_status: ["pendente", "em_andamento", "concluida", "cancelada"],
    },
  },
} as const
