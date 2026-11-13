"use client"

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function GraficoFluxo({ dados }: { dados: { periodo: string; entradas: number; saidas: number; saldo: number }[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="#dfe4ea" />
          <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#5f6b78" }} />
          <YAxis tickFormatter={(v) => moeda(v)} width={90} tick={{ fontSize: 11, fill: "#5f6b78" }} />
          <Tooltip formatter={(v: number, nome: string) => [moeda(v), nome]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="entradas" name="Entradas" fill="#059669" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="saidas" name="Saídas" fill="#dc2626" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Line dataKey="saldo" name="Saldo acumulado" stroke="#22313f" strokeWidth={2} dot={false} type="monotone" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
