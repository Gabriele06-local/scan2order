export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          waiter_confirmation_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          waiter_confirmation_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          waiter_confirmation_enabled?: boolean;
          created_at?: string;
        };
      };
      tables: {
        Row: {
          id: string;
          tenant_id: string;
          label: string;
          qr_token: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          label: string;
          qr_token?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          label?: string;
          qr_token?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          tenant_id: string;
          auth_user_id: string;
          role: 'cameriere' | 'cucina' | 'admin';
        };
        Insert: {
          id?: string;
          tenant_id: string;
          auth_user_id: string;
          role: 'cameriere' | 'cucina' | 'admin';
        };
        Update: {
          id?: string;
          tenant_id?: string;
          auth_user_id?: string;
          role?: 'cameriere' | 'cucina' | 'admin';
        };
      };
      menu_categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          sort_order?: number;
        };
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          price_cents: number;
          available: boolean;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          category_id: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          price_cents: number;
          available?: boolean;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          category_id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          price_cents?: number;
          available?: boolean;
          image_url?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          table_id: string;
          status: 'submitted' | 'pending_waiter_review' | 'confirmed' | 'in_kitchen' | 'ready' | 'served';
          total_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          table_id: string;
          status?: 'submitted' | 'pending_waiter_review' | 'confirmed' | 'in_kitchen' | 'ready' | 'served';
          total_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          table_id?: string;
          status?: 'submitted' | 'pending_waiter_review' | 'confirmed' | 'in_kitchen' | 'ready' | 'served';
          total_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          notes: string | null;
          unit_price_cents: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          notes?: string | null;
          unit_price_cents: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          quantity?: number;
          notes?: string | null;
          unit_price_cents?: number;
        };
      };
    };
    Functions: {
      transition_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: string;
          p_actor_role?: string;
        };
        Returns: void;
      };
      create_order: {
        Args: {
          p_tenant_id: string;
          p_table_id: string;
          p_items: Json;
        };
        Returns: string;
      };
    };
  };
}
