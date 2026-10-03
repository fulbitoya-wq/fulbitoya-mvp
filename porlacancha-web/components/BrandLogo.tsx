import Image from "next/image";
import Link from "next/link";

type Size = "header" | "nav" | "hero";

const box: Record<Size, { width: number; height: number; className: string }> = {
  header: { width: 280, height: 280, className: "h-14 w-14" },
  nav: { width: 520, height: 190, className: "h-10 w-[148px] sm:h-11 sm:w-[168px]" },
  hero: { width: 280, height: 280, className: "mx-auto h-[220px] w-[220px] sm:h-[260px] sm:w-[260px]" },
};

export function BrandLogo({ size = "header" }: { size?: Size }) {
  const s = box[size];
  const img = (
    <Image
      src="/brand/porlacancha.png"
      alt="PorLaCancha"
      width={s.width}
      height={s.height}
      className={`${s.className} object-contain object-left`}
      priority
    />
  );

  if (size === "hero") return img;

  return (
    <Link href="/" className="inline-flex shrink-0" aria-label="PorLaCancha">
      {img}
    </Link>
  );
}
