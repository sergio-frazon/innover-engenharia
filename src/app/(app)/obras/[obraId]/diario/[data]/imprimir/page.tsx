import { notFound } from "next/navigation"
import { exigirPapel } from "@/lib/auth"
import { getObra } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { data as fmtData, dataHora, hora, quantidade } from "@/lib/format"
import { CLIMA, STATUS_DIARIO, TIPO_OCORRENCIA } from "@/lib/rotulos"
import { Logo } from "@/components/comum/logo"
import { BotaoImprimir } from "./botao"

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-slate-500">{rotulo}</dt>
      <dd>{valor || "—"}</dd>
    </div>
  )
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="mb-1.5 border-b border-slate-400 pb-0.5 text-sm font-bold tracking-wide uppercase">{titulo}</h2>
      {children}
    </section>
  )
}

export default async function ImprimirDiario({ params }: { params: Promise<{ obraId: string; data: string }> }) {
  const { obraId, data: dia } = await params
  await exigirPapel("admin", "gestor", "campo")
  const obra = await getObra(obraId)
  const supabase = await createClient()
  const { data: d } = await supabase
    .from("diarios")
    .select("*, autor:perfis!diarios_criado_por_fkey(nome), revisor:perfis!diarios_revisado_por_fkey(nome)")
    .eq("obra_id", obra.id)
    .eq("data", dia)
    .maybeSingle()
  if (!d) notFound()

  const [{ data: equipe }, { data: medicoes }, { data: materiais }, { data: equipamentos }, { data: ocorrencias }] = await Promise.all([
    supabase.from("diario_equipe").select("*, profissional:profissionais(nome)").eq("diario_id", d.id).order("criado_em"),
    supabase.from("medicoes").select("quantidade, local, justificativa_excesso, servico:servicos(codigo, descricao, unidade)").eq("diario_id", d.id),
    supabase.from("diario_materiais").select("descricao, quantidade, unidade").eq("diario_id", d.id),
    supabase.from("diario_equipamentos").select("descricao, horas, observacao").eq("diario_id", d.id),
    supabase.from("diario_ocorrencias").select("tipo, hora, descricao").eq("diario_id", d.id).order("hora", { nullsFirst: false }),
  ])

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-6 text-[13px] leading-snug text-slate-900 print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 14mm; }`}</style>
      <div className="mb-4 flex justify-end print:hidden">
        <BotaoImprimir />
      </div>
      <header className="flex items-start justify-between border-b-2 border-slate-800 pb-2">
        <div className="flex items-start gap-4">
          <Logo className="h-12" />
          <div>
            <p className="text-xs text-slate-500">DIÁRIO DE OBRA</p>
            <h1 className="text-lg font-bold">{obra.nome}</h1>
            <p className="text-xs">
              {obra.codigo} · {obra.cliente?.nome ?? "—"} · {[obra.endereco, obra.cidade, obra.uf].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{fmtData(d.data)}</p>
          <p className="text-xs">{STATUS_DIARIO[d.status].texto}</p>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
        <Linha rotulo="Horário" valor={d.hora_inicio || d.hora_fim ? `${hora(d.hora_inicio)} às ${hora(d.hora_fim)}` : null} />
        <Linha rotulo="Responsável técnico" valor={obra.responsavel?.nome} />
        <Linha rotulo="Clima (manhã)" valor={d.clima_manha ? CLIMA[d.clima_manha] : null} />
        <Linha rotulo="Clima (tarde)" valor={d.clima_tarde ? CLIMA[d.clima_tarde] : null} />
      </dl>

      <Bloco titulo="Atividades">
        <p className="whitespace-pre-line">{d.atividades_resumo || "—"}</p>
      </Bloco>

      <Bloco titulo="Serviços executados">
        {(medicoes ?? []).length === 0 ? (
          <p>—</p>
        ) : (
          <table className="w-full">
            <tbody>
              {(medicoes ?? []).map((m, i) => (
                <tr key={i} className="border-b border-slate-200 align-top">
                  <td className="py-1 pr-2">
                    {m.servico?.codigo} {m.servico?.descricao}
                    {m.local && <span className="text-slate-500"> — {m.local}</span>}
                    {m.justificativa_excesso && <p className="text-xs text-slate-600">Excesso justificado: {m.justificativa_excesso}</p>}
                  </td>
                  <td className="py-1 text-right whitespace-nowrap">{quantidade(m.quantidade, m.servico?.unidade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Bloco>

      <div className="grid grid-cols-2 gap-x-6">
        <Bloco titulo="Equipe">
          {(equipe ?? []).length === 0 ? (
            <p>—</p>
          ) : (
            <ul>
              {(equipe ?? []).map((e) => (
                <li key={e.id}>
                  {e.quantidade > 1 && `${e.quantidade} × `}
                  {e.profissional?.nome ?? e.nome ?? e.funcao} ({e.funcao}){e.horas && ` — ${quantidade(e.horas)} h`}
                </li>
              ))}
              <li className="mt-1 font-semibold">Total: {(equipe ?? []).reduce((a, e) => a + e.quantidade, 0)} pessoa(s)</li>
            </ul>
          )}
        </Bloco>
        <Bloco titulo="Equipamentos">
          {(equipamentos ?? []).length === 0 ? (
            <p>—</p>
          ) : (
            <ul>
              {(equipamentos ?? []).map((e, i) => (
                <li key={i}>
                  {e.descricao}
                  {e.horas && ` — ${quantidade(e.horas)} h`}
                  {e.observacao && ` (${e.observacao})`}
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>

      <Bloco titulo="Materiais aplicados">
        {(materiais ?? []).length === 0 ? (
          <p>—</p>
        ) : (
          <ul>
            {(materiais ?? []).map((m, i) => (
              <li key={i}>
                {m.descricao} — {quantidade(m.quantidade, m.unidade)}
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <Bloco titulo="Ocorrências">
        {(ocorrencias ?? []).length === 0 ? (
          <p>—</p>
        ) : (
          <ul>
            {(ocorrencias ?? []).map((o, i) => (
              <li key={i}>
                <strong>{TIPO_OCORRENCIA[o.tipo]}</strong>
                {o.hora && ` (${hora(o.hora)})`}: {o.descricao}
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      {(d.impedimentos || d.observacoes) && (
        <Bloco titulo="Impedimentos e observações">
          {d.impedimentos && <p className="whitespace-pre-line">Impedimentos: {d.impedimentos}</p>}
          {d.observacoes && <p className="whitespace-pre-line">Observações: {d.observacoes}</p>}
        </Bloco>
      )}

      <footer className="mt-14 grid grid-cols-2 gap-10 break-inside-avoid text-center text-xs">
        <div>
          <div className="border-t border-slate-800 pt-1">Responsável técnico</div>
          <p className="text-slate-500">{obra.responsavel?.nome}</p>
        </div>
        <div>
          <div className="border-t border-slate-800 pt-1">Encarregado</div>
          <p className="text-slate-500">{d.autor?.nome}</p>
        </div>
      </footer>
      <p className="mt-6 text-[10px] text-slate-400">
        Gerado em {dataHora(new Date().toISOString())}
        {d.revisado_em && d.status === "aprovado" && ` · aprovado por ${d.revisor?.nome ?? "—"} em ${dataHora(d.revisado_em)}`}
      </p>
    </div>
  )
}
