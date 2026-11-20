import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { labels } from './models';
import { Action, Icon, Panel, colors, s } from './ui';
import { layout } from './layout';

export const options = (keys: string[]) => keys.map(key => ({ key, label: labels[key] || key || 'Tất cả' }));
export const reportLabel = (status: string) => status === 'pending' ? 'open' : status;
export type Resource<T> = { data?: T; error?: string };

export function tableHead(fields: string[]) {
  return <View style={layout.tableHeading}>{fields.map((value, i) => <Text key={value} style={[s.label, { flex: i === 0 ? 2 : 1 }]}>{value}</Text>)}</View>;
}
export function heading(title: string, subtitle?: string, action?: ReactNode) {
  return <View style={s.between}><View style={s.flex}><Text accessibilityRole="header" style={s.title}>{title}</Text>
    {!!subtitle && <Text style={s.muted}>{subtitle}</Text>}</View>{action}</View>;
}
export function keyValue(key: string, value?: string) {
  return <View style={s.between}><Text style={s.muted}>{key}</Text><Text style={[s.bold, { flexShrink: 1 }]}>{value || '—'}</Text></View>;
}
export function check(label: string, isSelected: boolean, onPress: () => void) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} accessibilityLabel={label} onPress={onPress} style={s.row}>
    <Icon name={isSelected ? 'checkbox' : 'square-outline'} size={21} />{label && <Text style={[s.body, { flexShrink: 1 }]}>{label}</Text>}
  </Pressable>;
}
export function renderResult<T>(resource: Resource<T>, render: (value: T) => ReactNode, update: () => void) {
  if (resource.error) return <Panel><Text style={s.body}>{resource.error}</Text><Action label="Thử lại" onPress={update} /></Panel>;
  if (!resource.data) return <ActivityIndicator accessibilityLabel="Đang tải" color={colors.navy} style={{ marginVertical: 16 }} />;
  return render(resource.data);
}
