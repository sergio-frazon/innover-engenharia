import Image from "next/image";
import { cn } from "@/lib/utils";

// Logo da Innover Engenharia (public/logo-innover.png, proporção 414×225)
export function Logo({
  className,
  prioridade,
}: {
  className?: string;
  prioridade?: boolean;
}) {
  return (
    <Image
      src="/logo-innover.png"
      alt="Innover Engenharia"
      width={414}
      height={225}
      priority={prioridade}
      className={cn("h-10 w-auto", className)}
    />
  );
}
