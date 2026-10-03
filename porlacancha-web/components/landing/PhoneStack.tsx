type Props = {
  frontSrc?: string;
  backSrc?: string;
};

function Phone({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="relative h-[420px] w-[206px] overflow-hidden rounded-[36px] border-[8px] border-[#0A1628] bg-[#001B44] shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:h-[520px] sm:w-[252px] sm:rounded-[42px] sm:border-[10px]">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black sm:h-6 sm:w-24" />
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#002B62] px-4 text-center">
            <p className="text-[12px] leading-5 text-[#8BC9EB]">{alt}</p>
          </div>
        )}
      </div>
    </figure>
  );
}

export function PhoneStack({ frontSrc, backSrc }: Props) {
  return (
    <div className="landing-phones relative mx-auto flex h-[460px] w-full max-w-[520px] items-center justify-center sm:h-[580px]">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8BC9EB]/15 blur-3xl"
        aria-hidden
      />
      <Phone
        src={backSrc}
        alt="Vista de detalle de un desafío en PorLaCancha. Screenshot real de la app, próximo."
        className="absolute left-[8%] top-8 z-0 origin-center rotate-[5deg] sm:left-[6%] sm:top-10"
      />
      <Phone
        src={frontSrc}
        alt="Vista Explorar de PorLaCancha. Screenshot real de la app, próximo."
        className="absolute right-[6%] top-0 z-10 origin-center rotate-[-5deg] sm:right-[4%]"
      />
    </div>
  );
}
