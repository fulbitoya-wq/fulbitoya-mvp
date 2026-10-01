import type { Metadata } from "next";
import { ConfirmadoClient } from "./ConfirmadoClient";

export const metadata: Metadata = { title: "Cuenta confirmada" };

export default function ConfirmadoPage() {
  return <ConfirmadoClient />;
}
