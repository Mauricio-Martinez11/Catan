declare module "react-native-web" {
  import type { ComponentType, HTMLAttributes, CSSProperties } from "react";
  type Props = HTMLAttributes<HTMLElement> & { style?: CSSProperties };
  export const View: ComponentType<Props>;
  export const Text: ComponentType<Props>;
  export const Pressable: ComponentType<
    Props & { onPress?: () => void; disabled?: boolean }
  >;
}
