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
      admin_audit: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event: string
          id: string
          workspace_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event: string
          id?: string
          workspace_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event?: string
          id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          became_customer_at: string | null
          created_at: string
          document_number: string | null
          employee_range: string | null
          id: string
          legal_name: string | null
          lifecycle_status: string
          location: string | null
          name: string
          revenue_range: string | null
          search_vector: unknown
          segment: string | null
          updated_at: string
          version: number
          website: string | null
          workspace_id: string
        }
        Insert: {
          became_customer_at?: string | null
          created_at?: string
          document_number?: string | null
          employee_range?: string | null
          id?: string
          legal_name?: string | null
          lifecycle_status?: string
          location?: string | null
          name: string
          revenue_range?: string | null
          search_vector?: unknown
          segment?: string | null
          updated_at?: string
          version?: number
          website?: string | null
          workspace_id: string
        }
        Update: {
          became_customer_at?: string | null
          created_at?: string
          document_number?: string | null
          employee_range?: string | null
          id?: string
          legal_name?: string | null
          lifecycle_status?: string
          location?: string | null
          name?: string
          revenue_range?: string | null
          search_vector?: unknown
          segment?: string | null
          updated_at?: string
          version?: number
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          linkedin_url: string | null
          name: string
          phone: string | null
          role: string | null
          updated_at: string
          version: number
          website: string | null
          workspace_id: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          linkedin_url?: string | null
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          version?: number
          website?: string | null
          workspace_id: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          version?: number
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_tenant_fk"
            columns: ["workspace_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          deal_id: string
          description: string
          id: string
          scheduled_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id: string
          description?: string
          id?: string
          scheduled_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string
          description?: string
          id?: string
          scheduled_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_workspace_id_deal_id_fkey"
            columns: ["workspace_id", "deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "deal_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_files: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          deal_id: string
          id: string
          note_id: string | null
          original_name: string
          size_bytes: number
          status: string
          storage_path: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by?: string | null
          deal_id: string
          id?: string
          note_id?: string | null
          original_name: string
          size_bytes: number
          status?: string
          storage_path: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string
          id?: string
          note_id?: string | null
          original_name?: string
          size_bytes?: number
          status?: string
          storage_path?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_files_workspace_id_deal_id_fkey"
            columns: ["workspace_id", "deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "deal_files_workspace_id_deal_id_note_id_fkey"
            columns: ["workspace_id", "deal_id", "note_id"]
            isOneToOne: false
            referencedRelation: "deal_notes"
            referencedColumns: ["workspace_id", "deal_id", "id"]
          },
          {
            foreignKeyName: "deal_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_history: {
        Row: {
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          deal_id: string
          event: string
          id: string
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          deal_id: string
          event: string
          id?: string
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          deal_id?: string
          event?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_history_workspace_id_deal_id_fkey"
            columns: ["workspace_id", "deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      deal_notes: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          deal_id: string
          id: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          deal_id: string
          id?: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string
          id?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_notes_workspace_id_deal_id_fkey"
            columns: ["workspace_id", "deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "deal_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          name: string
          owner_id: string | null
          position: number
          prospect_id: string | null
          score: number
          search_vector: unknown
          service_id: string | null
          stage: string
          stage_entered_at: string
          status: string
          summary: string
          updated_at: string
          value: number
          version: number
          workspace_id: string
        }
        Insert: {
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name: string
          owner_id?: string | null
          position?: number
          prospect_id?: string | null
          score?: number
          search_vector?: unknown
          service_id?: string | null
          stage?: string
          stage_entered_at?: string
          status?: string
          summary?: string
          updated_at?: string
          value?: number
          version?: number
          workspace_id: string
        }
        Update: {
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name?: string
          owner_id?: string | null
          position?: number
          prospect_id?: string | null
          score?: number
          search_vector?: unknown
          service_id?: string | null
          stage?: string
          stage_entered_at?: string
          status?: string
          summary?: string
          updated_at?: string
          value?: number
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_tenant_fk"
            columns: ["workspace_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "deals_contact_tenant_fk"
            columns: ["workspace_id", "company_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "company_id", "id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_tenant_fk"
            columns: ["workspace_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
          {
            foreignKeyName: "deals_prospect_tenant_fk"
            columns: ["workspace_id", "prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "deals_service_tenant_fk"
            columns: ["workspace_id", "service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      member_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_settle: boolean
          can_reverse: boolean
          can_read: boolean
          can_update: boolean
          module: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_settle?: boolean
          can_reverse?: boolean
          can_read?: boolean
          can_update?: boolean
          module: string
          user_id: string
          workspace_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_settle?: boolean
          can_reverse?: boolean
          can_read?: boolean
          can_update?: boolean
          module?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_permissions_workspace_id_user_id_fkey"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          version: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          version?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      prospect_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          linkedin_url: string | null
          name: string
          phone: string | null
          prospect_id: string
          role: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          linkedin_url?: string | null
          name: string
          phone?: string | null
          prospect_id: string
          role?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          prospect_id?: string
          role?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_favorites: {
        Row: {
          created_at: string
          prospect_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          prospect_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          prospect_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_favorites_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_score_axes: {
        Row: {
          created_at: string
          id: string
          name: string
          prospect_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          prospect_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          prospect_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "prospect_score_axes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          company_id: string | null
          created_at: string
          document_number: string | null
          employee_range: string | null
          id: string
          insight: string | null
          legal_name: string | null
          location: string | null
          name: string
          pain_point: string | null
          potential: string
          recommended_service: string | null
          revenue_range: string | null
          score: number | null
          segment: string | null
          source: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          document_number?: string | null
          employee_range?: string | null
          id?: string
          insight?: string | null
          legal_name?: string | null
          location?: string | null
          name: string
          pain_point?: string | null
          potential?: string
          recommended_service?: string | null
          revenue_range?: string | null
          score?: number | null
          segment?: string | null
          source?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          document_number?: string | null
          employee_range?: string | null
          id?: string
          insight?: string | null
          legal_name?: string | null
          location?: string | null
          name?: string
          pain_point?: string | null
          potential?: string
          recommended_service?: string | null
          revenue_range?: string | null
          score?: number | null
          segment?: string | null
          source?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_company_tenant_fk"
            columns: ["workspace_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "prospects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          revoked_at: string | null
          role: string
          token_hash: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          role: string
          token_hash: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          role?: string
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          active: boolean
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_modules: {
        Row: {
          enabled: boolean
          module: string
          workspace_id: string
        }
        Insert: {
          enabled?: boolean
          module: string
          workspace_id: string
        }
        Update: {
          enabled?: boolean
          module?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_modules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          contact_email: string | null
          created_at: string
          document_number: string | null
          id: string
          is_lume: boolean
          legal_name: string | null
          location: string | null
          name: string
          owner_id: string | null
          phone: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          document_number?: string | null
          id?: string
          is_lume?: boolean
          legal_name?: string | null
          location?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          document_number?: string | null
          id?: string
          is_lume?: boolean
          legal_name?: string | null
          location?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // Pending migration: 20260914220000_company_finance.sql
      finance_snapshot: { Args: { target: string; filters: Json }; Returns: Json }
      finance_search_companies: { Args: { target: string; query: string }; Returns: Json }
      finance_entry_detail: { Args: { target: string; entry: string }; Returns: Json }
      finance_save_category: { Args: { target: string; payload: Json }; Returns: string }
      finance_save_entry: { Args: { target: string; payload: Json }; Returns: string }
      finance_settle: { Args: { target: string; payload: Json }; Returns: string }
      finance_reverse_payment: { Args: { target: string; payload: Json }; Returns: undefined }
      finance_cancel_entry: { Args: { target: string; payload: Json }; Returns: undefined }
      accept_workspace_invite: { Args: { token: string }; Returns: string }
      create_workspace: { Args: { company_name: string }; Returns: string }
      create_workspace_invite: {
        Args: {
          invite_email: string
          invite_role: string
          target: string
          token: string
        }
        Returns: string
      }
      is_lume_master: { Args: never; Returns: boolean }
      list_masters: {
        Args: never
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      manage_member: {
        Args: {
          enabled: boolean
          member_role: string
          permissions: Json
          person: string
          target: string
        }
        Returns: undefined
      }
      module_access: {
        Args: { operation: string; product: string; target: string }
        Returns: boolean
      }
      platform_manage: {
        Args: { operation: string; payload: Json; target: string }
        Returns: Json
      }
      revoke_workspace_invite: {
        Args: { invite_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
