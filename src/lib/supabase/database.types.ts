
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "auditoria": {
                  Row: {
                    "acao": string,"antes": Json | null,"depois": Json | null,"em": string,"id": number,"obra_id": string | null,"registro_id": string,"tabela": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"antes"?: Json | null,"depois"?: Json | null,"em"?: string,"id"?: never,"obra_id"?: string | null,"registro_id": string,"tabela": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "acao"?: string,"antes"?: Json | null,"depois"?: Json | null,"em"?: string,"id"?: never,"obra_id"?: string | null,"registro_id"?: string,"tabela"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"baixas": {
                  Row: {
                    "atualizado_em": string,"comprovante_caminho": string | null,"criado_em": string,"criado_por": string | null,"data_pagamento": string,"desconto": number,"estornada": boolean,"forma": string,"id": string,"juros_multa": number,"motivo_estorno": string | null,"observacao": string | null,"parcela_id": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"comprovante_caminho"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_pagamento": string,"desconto"?: number,"estornada"?: boolean,"forma": string,"id"?: string,"juros_multa"?: number,"motivo_estorno"?: string | null,"observacao"?: string | null,"parcela_id": string,"valor": number
                  }
                  Update: {
                    "atualizado_em"?: string,"comprovante_caminho"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_pagamento"?: string,"desconto"?: number,"estornada"?: boolean,"forma"?: string,"id"?: string,"juros_multa"?: number,"motivo_estorno"?: string | null,"observacao"?: string | null,"parcela_id"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "baixas_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "baixas_parcela_id_fkey"
      columns: ["parcela_id"]
isOneToOne: false
      referencedRelation: "parcelas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "baixas_parcela_id_fkey"
      columns: ["parcela_id"]
isOneToOne: false
      referencedRelation: "v_parcelas_situacao"
      referencedColumns: ["id"]
    }
                  ]
                },"categorias_financeiras": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"criado_em": string,"criado_por": string | null,"id": string,"nome": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"nome": string,"tipo": string
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"nome"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categorias_financeiras_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"cronograma_atividades": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"duracao_dias": number | null,"fim_previsto": string,"id": string,"inicio_previsto": string,"servico_id": string,"versao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"duracao_dias"?: never,"fim_previsto": string,"id"?: string,"inicio_previsto": string,"servico_id": string,"versao_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"duracao_dias"?: never,"fim_previsto"?: string,"id"?: string,"inicio_previsto"?: string,"servico_id"?: string,"versao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cronograma_atividades_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cronograma_atividades_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cronograma_atividades_versao_id_fkey"
      columns: ["versao_id"]
isOneToOne: false
      referencedRelation: "cronograma_versoes"
      referencedColumns: ["id"]
    }
                  ]
                },"cronograma_dependencias": {
                  Row: {
                    "criado_em": string,"predecessor_id": string,"servico_id": string,"versao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"predecessor_id": string,"servico_id": string,"versao_id": string
                  }
                  Update: {
                    "criado_em"?: string,"predecessor_id"?: string,"servico_id"?: string,"versao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cronograma_dependencias_predecessor_id_fkey"
      columns: ["predecessor_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cronograma_dependencias_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cronograma_dependencias_versao_id_fkey"
      columns: ["versao_id"]
isOneToOne: false
      referencedRelation: "cronograma_versoes"
      referencedColumns: ["id"]
    }
                  ]
                },"cronograma_versoes": {
                  Row: {
                    "aprovada_em": string | null,"aprovada_por": string | null,"atualizado_em": string,"criado_em": string,"criado_por": string | null,"descricao": string | null,"id": string,"numero": number,"obra_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aprovada_em"?: string | null,"aprovada_por"?: string | null,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"id"?: string,"numero": number,"obra_id": string,"status"?: string
                  }
                  Update: {
                    "aprovada_em"?: string | null,"aprovada_por"?: string | null,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"id"?: string,"numero"?: number,"obra_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cronograma_versoes_aprovada_por_fkey"
      columns: ["aprovada_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cronograma_versoes_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cronograma_versoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cronograma_versoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    }
                  ]
                },"diario_equipamentos": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"descricao": string,"diario_id": string,"equipamento_id": string | null,"horas": number | null,"id": string,"observacao": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao": string,"diario_id": string,"equipamento_id"?: string | null,"horas"?: number | null,"id"?: string,"observacao"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string,"diario_id"?: string,"equipamento_id"?: string | null,"horas"?: number | null,"id"?: string,"observacao"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "diario_equipamentos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diario_equipamentos_diario_id_fkey"
      columns: ["diario_id"]
isOneToOne: false
      referencedRelation: "diarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diario_equipamentos_equipamento_id_fkey"
      columns: ["equipamento_id"]
isOneToOne: false
      referencedRelation: "equipamentos"
      referencedColumns: ["id"]
    }
                  ]
                },"diario_equipe": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"diario_id": string,"funcao": string,"horas": number | null,"id": string,"nome": string | null,"profissional_id": string | null,"quantidade": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"diario_id": string,"funcao": string,"horas"?: number | null,"id"?: string,"nome"?: string | null,"profissional_id"?: string | null,"quantidade"?: number
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"diario_id"?: string,"funcao"?: string,"horas"?: number | null,"id"?: string,"nome"?: string | null,"profissional_id"?: string | null,"quantidade"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "diario_equipe_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diario_equipe_diario_id_fkey"
      columns: ["diario_id"]
isOneToOne: false
      referencedRelation: "diarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diario_equipe_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissionais"
      referencedColumns: ["id"]
    }
                  ]
                },"diario_materiais": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"descricao": string,"diario_id": string,"id": string,"material_id": string | null,"quantidade": number,"servico_id": string | null,"unidade": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao": string,"diario_id": string,"id"?: string,"material_id"?: string | null,"quantidade": number,"servico_id"?: string | null,"unidade": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string,"diario_id"?: string,"id"?: string,"material_id"?: string | null,"quantidade"?: number,"servico_id"?: string | null,"unidade"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "diario_materiais_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diario_materiais_diario_id_fkey"
      columns: ["diario_id"]
isOneToOne: false
      referencedRelation: "diarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diario_materiais_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materiais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diario_materiais_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"diario_ocorrencias": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"descricao": string,"diario_id": string,"hora": string | null,"id": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao": string,"diario_id": string,"hora"?: string | null,"id"?: string,"tipo": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string,"diario_id"?: string,"hora"?: string | null,"id"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "diario_ocorrencias_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diario_ocorrencias_diario_id_fkey"
      columns: ["diario_id"]
isOneToOne: false
      referencedRelation: "diarios"
      referencedColumns: ["id"]
    }
                  ]
                },"diarios": {
                  Row: {
                    "atividades_resumo": string | null,"atualizado_em": string,"clima_manha": string | null,"clima_tarde": string | null,"comentario_revisao": string | null,"criado_em": string,"criado_por": string | null,"data": string,"enviado_em": string | null,"enviado_por": string | null,"hora_fim": string | null,"hora_inicio": string | null,"id": string,"impedimentos": string | null,"obra_id": string,"observacoes": string | null,"revisado_em": string | null,"revisado_por": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atividades_resumo"?: string | null,"atualizado_em"?: string,"clima_manha"?: string | null,"clima_tarde"?: string | null,"comentario_revisao"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data": string,"enviado_em"?: string | null,"enviado_por"?: string | null,"hora_fim"?: string | null,"hora_inicio"?: string | null,"id"?: string,"impedimentos"?: string | null,"obra_id": string,"observacoes"?: string | null,"revisado_em"?: string | null,"revisado_por"?: string | null,"status"?: string
                  }
                  Update: {
                    "atividades_resumo"?: string | null,"atualizado_em"?: string,"clima_manha"?: string | null,"clima_tarde"?: string | null,"comentario_revisao"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"enviado_em"?: string | null,"enviado_por"?: string | null,"hora_fim"?: string | null,"hora_inicio"?: string | null,"id"?: string,"impedimentos"?: string | null,"obra_id"?: string,"observacoes"?: string | null,"revisado_em"?: string | null,"revisado_por"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "diarios_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diarios_enviado_por_fkey"
      columns: ["enviado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diarios_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diarios_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    },{
      foreignKeyName: "diarios_revisado_por_fkey"
      columns: ["revisado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"documentos": {
                  Row: {
                    "atualizado_em": string,"caminho_arquivo": string,"categoria": string,"criado_em": string,"criado_por": string | null,"etapa_id": string | null,"grupo_id": string,"id": string,"nome_arquivo": string,"obra_id": string,"observacao": string | null,"tamanho_bytes": number,"tipo_mime": string,"titulo": string,"versao": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"caminho_arquivo": string,"categoria": string,"criado_em"?: string,"criado_por"?: string | null,"etapa_id"?: string | null,"grupo_id"?: string,"id"?: string,"nome_arquivo": string,"obra_id": string,"observacao"?: string | null,"tamanho_bytes": number,"tipo_mime": string,"titulo": string,"versao"?: number
                  }
                  Update: {
                    "atualizado_em"?: string,"caminho_arquivo"?: string,"categoria"?: string,"criado_em"?: string,"criado_por"?: string | null,"etapa_id"?: string | null,"grupo_id"?: string,"id"?: string,"nome_arquivo"?: string,"obra_id"?: string,"observacao"?: string | null,"tamanho_bytes"?: number,"tipo_mime"?: string,"titulo"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "documentos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_etapa_id_fkey"
      columns: ["etapa_id"]
isOneToOne: false
      referencedRelation: "etapas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    }
                  ]
                },"equipamentos": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"criado_em": string,"criado_por": string | null,"descricao": string,"id": string,"identificacao": string | null,"propriedade": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao": string,"id"?: string,"identificacao"?: string | null,"propriedade": string
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string,"id"?: string,"identificacao"?: string | null,"propriedade"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipamentos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"etapas": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"codigo": string,"criado_em": string,"criado_por": string | null,"id": string,"nome": string,"obra_id": string,"ordem": number,"responsavel_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"codigo": string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"nome": string,"obra_id": string,"ordem"?: number,"responsavel_id"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"codigo"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"nome"?: string,"obra_id"?: string,"ordem"?: number,"responsavel_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "etapas_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "etapas_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "etapas_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    },{
      foreignKeyName: "etapas_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"lancamentos": {
                  Row: {
                    "atualizado_em": string,"cancelado": boolean,"categoria_id": string,"criado_em": string,"criado_por": string | null,"data_competencia": string,"descricao": string,"documento_numero": string | null,"etapa_id": string | null,"id": string,"motivo_cancelamento": string | null,"natureza": string | null,"obra_id": string | null,"observacao": string | null,"origem_id": string | null,"origem_tipo": string | null,"pessoa_id": string | null,"tipo": string,"valor_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cancelado"?: boolean,"categoria_id": string,"criado_em"?: string,"criado_por"?: string | null,"data_competencia": string,"descricao": string,"documento_numero"?: string | null,"etapa_id"?: string | null,"id"?: string,"motivo_cancelamento"?: string | null,"natureza"?: string | null,"obra_id"?: string | null,"observacao"?: string | null,"origem_id"?: string | null,"origem_tipo"?: string | null,"pessoa_id"?: string | null,"tipo": string,"valor_total": number
                  }
                  Update: {
                    "atualizado_em"?: string,"cancelado"?: boolean,"categoria_id"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_competencia"?: string,"descricao"?: string,"documento_numero"?: string | null,"etapa_id"?: string | null,"id"?: string,"motivo_cancelamento"?: string | null,"natureza"?: string | null,"obra_id"?: string | null,"observacao"?: string | null,"origem_id"?: string | null,"origem_tipo"?: string | null,"pessoa_id"?: string | null,"tipo"?: string,"valor_total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lancamentos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_etapa_id_fkey"
      columns: ["etapa_id"]
isOneToOne: false
      referencedRelation: "etapas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    },{
      foreignKeyName: "lancamentos_pessoa_id_fkey"
      columns: ["pessoa_id"]
isOneToOne: false
      referencedRelation: "pessoas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_pessoa_id_fkey"
      columns: ["pessoa_id"]
isOneToOne: false
      referencedRelation: "v_pessoas_basico"
      referencedColumns: ["id"]
    }
                  ]
                },"materiais": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"criado_em": string,"criado_por": string | null,"custo_unitario": number | null,"descricao": string,"id": string,"unidade": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"custo_unitario"?: number | null,"descricao": string,"id"?: string,"unidade": string
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"custo_unitario"?: number | null,"descricao"?: string,"id"?: string,"unidade"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "materiais_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"medicoes": {
                  Row: {
                    "atualizado_em": string,"comentario_revisao": string | null,"criado_em": string,"criado_por": string | null,"diario_id": string | null,"enviado_em": string | null,"id": string,"justificativa_excesso": string | null,"local": string | null,"obra_id": string,"observacao": string | null,"origem": string,"periodo_fim": string,"periodo_inicio": string,"quantidade": number,"revisado_em": string | null,"revisado_por": string | null,"servico_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"comentario_revisao"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"diario_id"?: string | null,"enviado_em"?: string | null,"id"?: string,"justificativa_excesso"?: string | null,"local"?: string | null,"obra_id": string,"observacao"?: string | null,"origem"?: string,"periodo_fim": string,"periodo_inicio": string,"quantidade": number,"revisado_em"?: string | null,"revisado_por"?: string | null,"servico_id": string,"status"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"comentario_revisao"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"diario_id"?: string | null,"enviado_em"?: string | null,"id"?: string,"justificativa_excesso"?: string | null,"local"?: string | null,"obra_id"?: string,"observacao"?: string | null,"origem"?: string,"periodo_fim"?: string,"periodo_inicio"?: string,"quantidade"?: number,"revisado_em"?: string | null,"revisado_por"?: string | null,"servico_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "medicoes_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "medicoes_diario_id_fkey"
      columns: ["diario_id"]
isOneToOne: false
      referencedRelation: "diarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "medicoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "medicoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    },{
      foreignKeyName: "medicoes_revisado_por_fkey"
      columns: ["revisado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "medicoes_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"obra_membros": {
                  Row: {
                    "criado_em": string,"obra_id": string,"perfil_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"obra_id": string,"perfil_id": string
                  }
                  Update: {
                    "criado_em"?: string,"obra_id"?: string,"perfil_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "obra_membros_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "obra_membros_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    },{
      foreignKeyName: "obra_membros_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"obras": {
                  Row: {
                    "atualizado_em": string,"cidade": string | null,"cliente_id": string | null,"codigo": string,"criado_em": string,"criado_por": string | null,"data_fim_prevista": string | null,"data_fim_real": string | null,"data_inicio_prevista": string | null,"data_inicio_real": string | null,"descricao": string | null,"endereco": string | null,"id": string,"nome": string,"responsavel_id": string,"situacao": string,"uf": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cidade"?: string | null,"cliente_id"?: string | null,"codigo": string,"criado_em"?: string,"criado_por"?: string | null,"data_fim_prevista"?: string | null,"data_fim_real"?: string | null,"data_inicio_prevista"?: string | null,"data_inicio_real"?: string | null,"descricao"?: string | null,"endereco"?: string | null,"id"?: string,"nome": string,"responsavel_id": string,"situacao"?: string,"uf"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"cidade"?: string | null,"cliente_id"?: string | null,"codigo"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_fim_prevista"?: string | null,"data_fim_real"?: string | null,"data_inicio_prevista"?: string | null,"data_inicio_real"?: string | null,"descricao"?: string | null,"endereco"?: string | null,"id"?: string,"nome"?: string,"responsavel_id"?: string,"situacao"?: string,"uf"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "obras_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "pessoas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "obras_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_pessoas_basico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "obras_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "obras_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"orcamento_itens": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"descricao": string,"id": string,"material_id": string | null,"natureza": string,"ordem": number,"quantidade": number,"servico_id": string,"unidade": string,"valor_total": number | null,"valor_unitario": number,"versao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao": string,"id"?: string,"material_id"?: string | null,"natureza": string,"ordem"?: number,"quantidade": number,"servico_id": string,"unidade": string,"valor_total"?: never,"valor_unitario": number,"versao_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string,"id"?: string,"material_id"?: string | null,"natureza"?: string,"ordem"?: number,"quantidade"?: number,"servico_id"?: string,"unidade"?: string,"valor_total"?: never,"valor_unitario"?: number,"versao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orcamento_itens_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_itens_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materiais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_itens_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_itens_versao_id_fkey"
      columns: ["versao_id"]
isOneToOne: false
      referencedRelation: "orcamento_versoes"
      referencedColumns: ["id"]
    }
                  ]
                },"orcamento_versoes": {
                  Row: {
                    "aprovada_em": string | null,"aprovada_por": string | null,"atualizado_em": string,"criado_em": string,"criado_por": string | null,"descricao": string | null,"id": string,"numero": number,"obra_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aprovada_em"?: string | null,"aprovada_por"?: string | null,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"id"?: string,"numero": number,"obra_id": string,"status"?: string
                  }
                  Update: {
                    "aprovada_em"?: string | null,"aprovada_por"?: string | null,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"id"?: string,"numero"?: number,"obra_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orcamento_versoes_aprovada_por_fkey"
      columns: ["aprovada_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_versoes_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_versoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_versoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    }
                  ]
                },"parcelas": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"id": string,"lancamento_id": string,"numero": number,"valor": number,"vencimento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"id"?: string,"lancamento_id": string,"numero": number,"valor": number,"vencimento": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"id"?: string,"lancamento_id"?: string,"numero"?: number,"valor"?: number,"vencimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parcelas_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "lancamentos"
      referencedColumns: ["id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"criado_em": string,"email": string,"id": string,"nome": string,"papel": string,"telefone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"email": string,"id": string,"nome": string,"papel"?: string,"telefone"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"email"?: string,"id"?: string,"nome"?: string,"papel"?: string,"telefone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"pessoas": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"criado_em": string,"criado_por": string | null,"documento": string | null,"eh_cliente": boolean,"eh_fornecedor": boolean,"eh_prestador": boolean,"email": string | null,"endereco": string | null,"id": string,"nome": string,"observacao": string | null,"telefone": string | null,"tipo_pessoa": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"documento"?: string | null,"eh_cliente"?: boolean,"eh_fornecedor"?: boolean,"eh_prestador"?: boolean,"email"?: string | null,"endereco"?: string | null,"id"?: string,"nome": string,"observacao"?: string | null,"telefone"?: string | null,"tipo_pessoa": string
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"documento"?: string | null,"eh_cliente"?: boolean,"eh_fornecedor"?: boolean,"eh_prestador"?: boolean,"email"?: string | null,"endereco"?: string | null,"id"?: string,"nome"?: string,"observacao"?: string | null,"telefone"?: string | null,"tipo_pessoa"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pessoas_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"profissionais": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"criado_em": string,"criado_por": string | null,"empresa_id": string | null,"funcao": string,"id": string,"nome": string,"telefone": string | null,"vinculo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"empresa_id"?: string | null,"funcao": string,"id"?: string,"nome": string,"telefone"?: string | null,"vinculo": string
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"empresa_id"?: string | null,"funcao"?: string,"id"?: string,"nome"?: string,"telefone"?: string | null,"vinculo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profissionais_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profissionais_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "pessoas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profissionais_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "v_pessoas_basico"
      referencedColumns: ["id"]
    }
                  ]
                },"servicos": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"codigo": string,"criado_em": string,"criado_por": string | null,"data_fim_real": string | null,"data_fim_real_automatica": boolean,"data_inicio_real": string | null,"descricao": string,"etapa_id": string,"id": string,"obra_id": string,"ordem": number,"quantidade_prevista": number,"responsavel_id": string | null,"unidade": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"codigo": string,"criado_em"?: string,"criado_por"?: string | null,"data_fim_real"?: string | null,"data_fim_real_automatica"?: boolean,"data_inicio_real"?: string | null,"descricao": string,"etapa_id": string,"id"?: string,"obra_id": string,"ordem"?: number,"quantidade_prevista": number,"responsavel_id"?: string | null,"unidade": string
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"codigo"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_fim_real"?: string | null,"data_fim_real_automatica"?: boolean,"data_inicio_real"?: string | null,"descricao"?: string,"etapa_id"?: string,"id"?: string,"obra_id"?: string,"ordem"?: number,"quantidade_prevista"?: number,"responsavel_id"?: string | null,"unidade"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "servicos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servicos_etapa_id_fkey"
      columns: ["etapa_id"]
isOneToOne: false
      referencedRelation: "etapas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servicos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servicos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    },{
      foreignKeyName: "servicos_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_alertas": {
                  Row: {
                    "data_referencia": string | null,"gravidade": string | null,"obra_id": string | null,"referencia_id": string | null,"tipo": string | null,"titulo": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_custo_obra": {
                  Row: {
                    "custo_realizado": number | null,"diferenca": number | null,"diferenca_pct": number | null,"obra_id": string,"valor_orcado": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_custo_previsto_realizado": {
                  Row: {
                    "diferenca": number | null,"diferenca_pct": number | null,"etapa_id": string | null,"natureza": string | null,"obra_id": string | null,"previsto": number | null,"realizado": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_documentos_atuais": {
                  Row: {
                    "atualizado_em": string,"caminho_arquivo": string,"categoria": string,"criado_em": string,"criado_por": string | null,"etapa_id": string | null,"grupo_id": string,"id": string,"nome_arquivo": string,"obra_id": string,"observacao": string | null,"primeira_versao_em": string | null,"tamanho_bytes": number,"tipo_mime": string,"titulo": string,"total_versoes": number | null,"versao": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "documentos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_etapa_id_fkey"
      columns: ["etapa_id"]
isOneToOne: false
      referencedRelation: "etapas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    }
                  ]
                },"v_fluxo_caixa": {
                  Row: {
                    "data": string,"entradas": number | null,"obra_id": string | null,"saidas": number | null,"tipo": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "lancamentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    }
                  ]
                },"v_orcamento_totais_etapa": {
                  Row: {
                    "etapa_id": string,"obra_id": string,"total": number | null,"versao_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "orcamento_itens_versao_id_fkey"
      columns: ["versao_id"]
isOneToOne: false
      referencedRelation: "orcamento_versoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_versoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_versoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    },{
      foreignKeyName: "servicos_etapa_id_fkey"
      columns: ["etapa_id"]
isOneToOne: false
      referencedRelation: "etapas"
      referencedColumns: ["id"]
    }
                  ]
                },"v_orcamento_totais_servico": {
                  Row: {
                    "etapa_id": string,"obra_id": string,"servico_id": string,"total": number | null,"total_equipamento": number | null,"total_mao_de_obra": number | null,"total_material": number | null,"total_outro": number | null,"versao_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "orcamento_itens_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_itens_versao_id_fkey"
      columns: ["versao_id"]
isOneToOne: false
      referencedRelation: "orcamento_versoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_versoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_versoes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    },{
      foreignKeyName: "servicos_etapa_id_fkey"
      columns: ["etapa_id"]
isOneToOne: false
      referencedRelation: "etapas"
      referencedColumns: ["id"]
    }
                  ]
                },"v_parcelas_situacao": {
                  Row: {
                    "cancelado": boolean,"categoria_id": string,"descricao": string,"dias_para_vencer": number | null,"documento_numero": string | null,"etapa_id": string | null,"id": string,"juros_multa_pagos": number | null,"lancamento_id": string,"natureza": string | null,"numero": number,"obra_id": string | null,"pessoa_id": string | null,"saldo": number | null,"situacao": string | null,"tipo": string,"total_parcelas": number | null,"ultimo_pagamento": string | null,"valor": number,"valor_pago": number | null,"vencimento": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "lancamentos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_etapa_id_fkey"
      columns: ["etapa_id"]
isOneToOne: false
      referencedRelation: "etapas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "v_custo_obra"
      referencedColumns: ["obra_id"]
    },{
      foreignKeyName: "lancamentos_pessoa_id_fkey"
      columns: ["pessoa_id"]
isOneToOne: false
      referencedRelation: "pessoas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_pessoa_id_fkey"
      columns: ["pessoa_id"]
isOneToOne: false
      referencedRelation: "v_pessoas_basico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parcelas_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "lancamentos"
      referencedColumns: ["id"]
    }
                  ]
                },"v_pessoas_basico": {
                  Row: {
                    "ativo": boolean,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                           "ativo"?: boolean | null,"id"?: string | null,"nome"?: string | null
                         }
                        Update: {
                           "ativo"?: boolean | null,"id"?: string | null,"nome"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "acessa_obra":
{ Args: { "p_obra": string }; Returns: boolean
                           },
"aprovar_cronograma":
{ Args: { "p_versao": string }; Returns: undefined
                           },
"aprovar_diario":
{ Args: { "p_diario": string }; Returns: undefined
                           },
"aprovar_medicao":
{ Args: { "p_medicao": string }; Returns: undefined
                           },
"aprovar_orcamento":
{ Args: { "p_versao": string }; Returns: undefined
                           },
"atualizar_datas_reais_servico":
{ Args: { "p_servico": string }; Returns: undefined
                           },
"atualizar_parcelas":
{ Args: { "p_lancamento": string,"p_parcelas": Json }; Returns: undefined
                           },
"cancelar_lancamento":
{ Args: { "p_lancamento": string,"p_motivo": string }; Returns: undefined
                           },
"criar_lancamento":
{ Args: { "p_dados": Json,"p_parcelas": Json }; Returns: string
                           },
"criar_revisao_cronograma":
{ Args: { "p_descricao"?: string,"p_obra": string }; Returns: string
                           },
"criar_revisao_orcamento":
{ Args: { "p_descricao"?: string,"p_obra": string }; Returns: string
                           },
"descartar_rascunho_cronograma":
{ Args: { "p_versao": string }; Returns: undefined
                           },
"descartar_rascunho_orcamento":
{ Args: { "p_versao": string }; Returns: undefined
                           },
"desligar_via_rpc":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"edita_versao_cronograma":
{ Args: { "p_versao": string }; Returns: boolean
                           },
"eh_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"enviar_diario":
{ Args: { "p_diario": string }; Returns: undefined
                           },
"enviar_medicao":
{ Args: { "p_medicao": string }; Returns: undefined
                           },
"erro":
{ Args: { "p_mensagem": string }; Returns: undefined
                           },
"estornar_baixa":
{ Args: { "p_baixa": string,"p_motivo": string }; Returns: undefined
                           },
"exigir_financeiro_obra":
{ Args: { "p_obra": string }; Returns: undefined
                           },
"exigir_gestor_obra":
{ Args: { "p_obra": string }; Returns: undefined
                           },
"exigir_obra_editavel":
{ Args: { "p_obra": string }; Returns: undefined
                           },
"formatar_reais":
{ Args: { "p_valor": number }; Returns: string
                           },
"gravar_parcelas":
{ Args: { "p_lancamento": string,"p_parcelas": Json }; Returns: undefined
                           },
"hoje":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"le_versao_cronograma":
{ Args: { "p_versao": string }; Returns: boolean
                           },
"ligar_via_rpc":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"obra_editavel":
{ Args: { "p_obra": string }; Returns: boolean
                           },
"papel_atual":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"pode_editar_diario":
{ Args: { "p_diario": string }; Returns: boolean
                           },
"pode_editar_financeiro_obra":
{ Args: { "p_obra": string }; Returns: boolean
                           },
"pode_ler_diario":
{ Args: { "p_diario": string }; Returns: boolean
                           },
"pode_ler_financeiro_obra":
{ Args: { "p_obra": string }; Returns: boolean
                           },
"pode_ler_lancamento":
{ Args: { "p_lancamento": string }; Returns: boolean
                           },
"progresso_etapas":
{ Args: { "p_obra": string }; Returns: {
              "avanco": number,"codigo": string,"etapa_id": string,"nome": string,"ordem": number,"peso": number,"servicos": number,"servicos_atrasados": number
            }[]
                           },
"progresso_obras":
{ Args: Record<PropertyKey, never>; Returns: {
              "avanco_fisico": number,"diarios_pendentes": number,"medicoes_pendentes": number,"obra_id": string,"peso_pelo_orcamento": boolean,"servicos": number,"servicos_atrasados": number,"servicos_em_risco": number
            }[]
                           },
"progresso_servicos":
{ Args: { "p_obra": string }; Returns: {
              "codigo": string,"data_fim_real": string,"data_inicio_real": string,"descricao": string,"duracao_dias": number,"etapa_id": string,"fim_previsto": string,"inicio_previsto": string,"ordem": number,"percentual": number,"percentual_esperado": number,"percentual_limitado": number,"peso": number,"peso_pelo_orcamento": boolean,"quantidade_aprovada": number,"quantidade_pendente": number,"quantidade_prevista": number,"responsavel_id": string,"sem_item_orcamento": boolean,"servico_id": string,"situacao_prazo": string,"unidade": string
            }[]
                           },
"reabrir_medicao":
{ Args: { "p_medicao": string,"p_motivo": string }; Returns: undefined
                           },
"rejeitar_medicao":
{ Args: { "p_comentario": string,"p_medicao": string }; Returns: undefined
                           },
"salvar_atividade_cronograma":
{ Args: { "p_ajustes"?: Json,"p_fim": string,"p_inicio": string,"p_predecessores"?: (string)[],"p_servico": string,"p_versao": string }; Returns: undefined
                           },
"servicos_pode_desativar":
{ Args: { "p_servico": string }; Returns: boolean
                           },
"solicitar_correcao_diario":
{ Args: { "p_comentario": string,"p_diario": string }; Returns: undefined
                           },
"tem_papel":
{ Args: { "p_papeis": (string)[] }; Returns: boolean
                           },
"uuid_ou_nulo":
{ Args: { "p_texto": string }; Returns: string
                           },
"validar_dependencia":
{ Args: { "p_predecessor": string,"p_servico": string,"p_versao": string }; Returns: undefined
                           },
"validar_excesso_medicao":
{ Args: { "p_medicao": string }; Returns: undefined
                           },
"via_rpc":
{ Args: Record<PropertyKey, never>; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
