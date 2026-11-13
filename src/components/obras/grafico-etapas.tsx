"use client"

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function GraficoEtapas({ etapas }: { etapas: { nome: string; avanco: number }[] }) {
  const altura = Math.max(160, etapas.length * 44 + 40)
  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={etapas} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
          <CartesianGrid horizontal={false} stroke="#dfe4ea" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: "#5f6b78" }} />
          <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 12, fill: "#33404d" }} />
          <Tooltip
            formatter={(v: number) => [`${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, "Avanço"]}
            cursor={{ fill: "#eef1f4" }}
          />
          <Bar dataKey="avanco" fill="#4b92c6" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
            <LabelList
              dataKey="avanco"
              position="right"
              formatter={(v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              style={{ fontSize: 12, fill: "#33404d" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
