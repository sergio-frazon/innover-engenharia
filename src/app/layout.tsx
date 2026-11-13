import type { Metadata, Viewport } from "next"
import { Archivo } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] })

export const metadata: Metadata = {
  title: { default: "Gestão de Obras · Innover Engenharia", template: "%s · Innover Engenharia" },
  description: "Innover Engenharia: planejamento, execução e financeiro de obras",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f5f7",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${archivo.variable} antialiased`}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
