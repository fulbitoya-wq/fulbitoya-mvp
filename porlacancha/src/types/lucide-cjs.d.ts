declare module "lucide-react-native/dist/cjs/icons/*.js" {
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
