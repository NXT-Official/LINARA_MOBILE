import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";

import { bodyFontFor } from "@/lib/typography";

/**
 * React Native's Text and TextInput, drawn in the brand's body face. A style
 * that names its own family (a Literata heading) keeps it; everything else
 * gets the Nunito Sans file for its weight (lib/typography.ts), so screens
 * set `fontWeight` as before and never fall back to the system font.
 */
export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  return <NativeText {...props} style={[style, bodyFontFor(flat.fontFamily, flat.fontWeight)]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <NativeTextInput {...props} style={[style, bodyFontFor(flat.fontFamily, flat.fontWeight)]} />
  );
}
