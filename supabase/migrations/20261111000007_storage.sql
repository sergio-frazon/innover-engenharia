-- =============================================================================
-- 0007 · Storage: buckets privados de documentos e comprovantes
-- Referências: docs/02-arquitetura.md (Storage), docs/05-permissoes.md, R-DOC-02/03
-- Caminho: {obra_id}/{uuid}/{arquivo}  ·  comprovante sem obra: sem-obra/{uuid}/{arquivo}
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documentos', 'documentos', false, 52428800, array[
    'application/pdf',
    'image/jpeg', 'image/png',
    'application/acad', 'image/vnd.dwg', 'image/x-dwg', 'application/dxf', 'image/vnd.dxf',
    'application/octet-stream',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword',
    'application/zip', 'application/x-zip-compressed'
  ]),
  ('comprovantes', 'comprovantes', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.uuid_ou_nulo(p_texto text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_texto::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- Documentos: membros leem; admin, gestor e campo enviam; ninguém altera ou apaga (R-DOC-02)
create policy "membros leem arquivos de documentos" on storage.objects for select to authenticated
  using (bucket_id = 'documentos'
         and public.acessa_obra(public.uuid_ou_nulo((storage.foldername(name))[1])));

create policy "membros enviam arquivos de documentos" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos'
              and public.tem_papel('admin', 'gestor', 'campo')
              and public.acessa_obra(public.uuid_ou_nulo((storage.foldername(name))[1]))
              and public.obra_editavel(public.uuid_ou_nulo((storage.foldername(name))[1])));

-- Comprovantes: admin e financeiro
create policy "financeiro le comprovantes" on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes'
         and public.tem_papel('admin', 'financeiro')
         and ((storage.foldername(name))[1] = 'sem-obra'
              or public.acessa_obra(public.uuid_ou_nulo((storage.foldername(name))[1]))));

create policy "financeiro envia comprovantes" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes'
              and public.tem_papel('admin', 'financeiro')
              and ((storage.foldername(name))[1] = 'sem-obra'
                   or public.acessa_obra(public.uuid_ou_nulo((storage.foldername(name))[1]))));
