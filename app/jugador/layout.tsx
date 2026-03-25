import { JugadorLayoutClient } from "./JugadorLayoutClient";

export default function JugadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <JugadorLayoutClient>{children}</JugadorLayoutClient>;
}
