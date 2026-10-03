import { CONTACT_EMAIL } from "@/lib/site";
import { LandingHero } from "@/components/landing/LandingHero";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="bg-[#001B44]">
      <LandingHero />

      <section id="como-funciona" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-16">
        <h2 className="text-3xl font-extrabold text-[#F7F5EF] sm:text-4xl">Cómo funciona</h2>
        <p className="mt-3 max-w-xl text-[#B8C4D6]">
          Armá el plantel, inscribite a un desafío y jugá en la cancha. El juego está en la app.
        </p>
      </section>

      <section id="funcionalidades" className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
        <h2 className="text-3xl font-extrabold text-[#F7F5EF] sm:text-4xl">Funcionalidades</h2>
        <p className="mt-3 max-w-xl text-[#B8C4D6]">Próximamente, con el resto de la maqueta.</p>
      </section>

      <section id="predios" className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
        <h2 className="text-3xl font-extrabold text-[#F7F5EF] sm:text-4xl">Para predios</h2>
        <p className="mt-3 max-w-xl text-[#B8C4D6]">
          Esta app es para jugadores y equipos amateur. Los predios no gestionan su operación desde
          acá.
        </p>
      </section>

      <section id="faq" className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
        <h2 className="text-3xl font-extrabold text-[#F7F5EF] sm:text-4xl">FAQ</h2>
        <p className="mt-3 max-w-xl text-[#B8C4D6]">Las preguntas frecuentes van en el siguiente paso.</p>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-[1440px] flex-wrap gap-x-6 gap-y-2 text-sm text-[#B8C4D6]">
          <Link href="/terminos">Términos y condiciones</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/soporte">Soporte</Link>
          <Link href="/eliminar-cuenta">Eliminar cuenta</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
      </footer>
    </div>
  );
}
