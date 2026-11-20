import type { ReactNode } from 'react';
import {
  Pressable, Text, TextInput, View, type PressableProps, type StyleProp,
  type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';

type TextButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  leading?: ReactNode;
};

export function TextButton({ label, labelStyle, leading, ...props }: TextButtonProps) {
  return <Pressable accessibilityRole="button" {...props}>
    {leading}
    <Text style={labelStyle}>{label}</Text>
  </Pressable>;
}

type LabeledFieldProps = TextInputProps & {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
};

export function LabeledField({ label, labelStyle, fieldStyle, ...input }: LabeledFieldProps) {
  return <View style={fieldStyle}>
    <Text style={labelStyle}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholder={label} {...input} />
  </View>;
}
