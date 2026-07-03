// Gera src/integrations/supabase/types.ts a partir do OpenAPI baixado
// de scripts/.openapi.json. Mantem compatibilidade com o shape atual
// (PostgrestVersion 14.5, helpers Tables<T>, TablesInsert<T>, etc).
//
// Uso: node scripts/gen-supabase-types.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync('scripts/.openapi.json', 'utf8'));
const defs = spec.definitions || {};

// Separa tabelas/views (definitions com chaves normais) de RPC (prefixo rpc_).
const tableNames = Object.keys(defs).filter((k) => !k.startsWith('rpc_'));
const rpcNames = Object.keys(defs).filter((k) => k.startsWith('rpc_'));

function pgType(t) {
  if (!t) return 'unknown';
  if (t.type === 'array') return pgType(t.items) + '[]';
  if (t.type === 'string') return 'string';
  if (t.type === 'integer' || t.type === 'number') return 'number';
  if (t.type === 'boolean') return 'boolean';
  if (t.type === 'object') {
    if (!t.properties) return 'Json';
    const props = Object.entries(t.properties)
      .map(([k, v]) => k + ': ' + pgType(v))
      .join('; ');
    return '{ ' + props + ' }';
  }
  return 'Json';
}

function indent(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((l) => (l.length ? pad + l : l))
    .join('\n');
}

function tableBlock(name) {
  const def = defs[name];
  if (!def || !def.properties) return '';
  const props = def.properties;
  const required = new Set(def.required || []);

  const rowFields = Object.entries(props).map(([k, v]) => {
    const t = pgType(v);
    return k + ': ' + t + (required.has(k) ? '' : ' | null');
  });

  const insertFields = Object.entries(props).map(([k, v]) => {
    const t = pgType(v);
    const opt = required.has(k) ? '' : ' | null';
    return k + '?: ' + t + opt;
  });

  const updateFields = Object.entries(props).map(([k, v]) => {
    const t = pgType(v);
    return k + '?: ' + t + ' | null';
  });

  return [
    '      ' + name + ': {',
    '        Row: {',
    indent(rowFields.join('\n'), 10),
    '        }',
    '        Insert: {',
    indent(insertFields.join('\n'), 10),
    '        }',
    '        Update: {',
    indent(updateFields.join('\n'), 10),
    '        }',
    '        Relationships: []',
    '      }',
  ].join('\n');
}

function rpcBlock(name) {
  // name vem como rpc_xxx — transformamos pra xxx.
  const def = defs[name];
  const rpcName = name.slice(4);
  const args = (def.parameters || [])
    .filter((p) => p.$ref && p.$ref.includes('singleArg'))
    .map((p) => {
      const schemaName = p.$ref.split('/').pop();
      const schema = defs[schemaName];
      if (!schema || !schema.properties) return 'unknown';
      return Object.entries(schema.properties)
        .map(([k, v]) => k + ': ' + pgType(v))
        .join('; ');
    })
    .join('; ');
  const returns = def.returns
    ? pgType(def.returns)
    : def.schema
      ? pgType(def.schema)
      : 'unknown';
  return ['      ' + rpcName + ': {', '        Args: ' + (args ? '{ ' + args + ' }' : '{}') + ';', '        Returns: ' + returns, '      }'].join('\n');
}

const tablesBlock = tableNames.map(tableBlock).join('\n');
const viewsBlock = ''; // Nao temos views no OpenAPI alem de tabelas marcadas.
const rpcsBlock = rpcNames.length ? rpcNames.map(rpcBlock).join('\n') : '      [_ in never]: never';

const out = `// Gerado automaticamente por scripts/gen-supabase-types.mjs.
// Fonte: OpenAPI do projeto (PostgREST). Nao editar manualmente.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
${tablesBlock}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
${rpcsBlock}
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
    ? DefaultSchema["Tables"][TableName] extends {
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
    ? DefaultSchema["Tables"][TableName] extends {
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
> = DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  PublicCompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  // @ts-expect-error template Supabase: nunca indexado se CompositeTypes for {}
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeName]
  : never
`;

writeFileSync('src/integrations/supabase/types.ts', out);
console.log('wrote', out.length, 'bytes');