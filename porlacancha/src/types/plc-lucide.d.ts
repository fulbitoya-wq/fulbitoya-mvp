declare module "@plc/lucide/*" {
  import type { ComponentType } from "react";
  import type { SvgProps } from "react-native-svg";

  const Icon: ComponentType<
    SvgProps & {
      color?: string;
      size?: number;
      strokeWidth?: number;
    }
  >;
  export default Icon;
}
