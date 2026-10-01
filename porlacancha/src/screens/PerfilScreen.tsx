import { Button, Heading, Kicker, Lead, Mute, Screen } from "../ui";

type Props = {
  guest: boolean;
  username?: string | null;
  onRequestAuth: () => void;
  onSignOut: () => void;
};

export function PerfilScreen({ guest, username, onRequestAuth, onSignOut }: Props) {
  return (
    <Screen scroll>
      <Kicker>Cuenta</Kicker>
      <Heading>Perfil</Heading>
      {guest ? (
        <>
          <Lead>Entrá para inscribir equipos y seguir tus partidos.</Lead>
          <Button label="Crear cuenta o ingresar" onPress={onRequestAuth} />
        </>
      ) : (
        <>
          <Lead>{username ? `@${username}` : "Tu cuenta"}</Lead>
          <Mute>Teléfono y usuario ya están listos. Más adelante: foto, equipos y partidos.</Mute>
          <Button label="Salir" variant="secondary" onPress={onSignOut} />
        </>
      )}
    </Screen>
  );
}
