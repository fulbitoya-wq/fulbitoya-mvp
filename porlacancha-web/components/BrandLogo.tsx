import Image from "next/image";
import Link from "next/link";

type Size = "header" | "hero";

const box: Record<Size, { width: number; height: number; className: string }> = {
  header: { width: 280, height: 280, className: "h-14 w-14" },
  hero: { width: 280, height: 280, className: "mx-auto h-[220px] w-[220px] sm:h-[260px] sm:w-[260px]" },
};

export function BrandLogo({ size = "header" }: { size?: Size }) {
  const s = box[size];
  const img = (
    <Image
      src="/brand/porlacancha.jpeg"
      alt="PorLaCancha — Y algo más"
      width={s.width}
      height={s.height}
      className={`${s.className} object-contain`}
      priority={size === "hero"}
    />
  );

  if (size === "header") {
    return (
      <Link href="/" className="inline-flex" aria-label="PorLaCancha">
        {img}
      </Link>
    );
  }

  return img;
}
