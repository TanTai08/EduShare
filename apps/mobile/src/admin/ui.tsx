import type { ComponentProps, ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { labels, number, type Post, type Stats } from './models';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export const colors = { navy: '#203448', yellow: '#ffcd12', ink: '#171b20', muted: '#657384',
  line: '#e6ebf0', bg: '#f5f7fa', white: '#ffffff', pale: '#fff3c0', blue: '#e7f0ff',
  red: '#ad3d36', pink: '#fce9e7', green: '#18754c', mint: '#e1f3e9' };
export function Icon({ name, size = 19, color = colors.navy }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Action({ label, onPress, icon, kind = 'plain', disabled = false }: {
  label: string; onPress: () => void; icon?: IconName; kind?: 'plain' | 'strong' | 'danger' | 'text'; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [
    s.action, kind === 'strong' && s.strong, kind === 'danger' && s.danger, kind === 'text' && s.textAction,
    (disabled || pressed) && { opacity: disabled ? 0.45 : 0.72 },
  ]}>{icon && <Icon name={icon} size={16} color={kind === 'danger' ? colors.red : colors.navy} />}
    <Text style={[s.actionText, kind === 'danger' && { color: colors.red }]}>{label}</Text>
  </Pressable>;
}
export function Panel({ children, title, subtitle, action }: { children: ReactNode; title?: string; subtitle?: string; action?: ReactNode }) {
  return <View style={s.panel}>
    {!!title && <View style={s.between}><View style={s.flex}><Text accessibilityRole="header" style={s.h2}>{title}</Text>
      {!!subtitle && <Text style={s.muted}>{subtitle}</Text>}</View>{action}</View>}
    {children}
  </View>;
}
export function Pill({ value }: { value: string }) {
  const green = ['active', 'approved', 'resolved'].includes(value);
  const red = ['rejected', 'locked', 'high', 'removed'].includes(value);
  const yellow = ['pending', 'open', 'restricted', 'revision'].includes(value);
  return <View style={[s.pill, { backgroundColor: green ? colors.mint : red ? colors.pink : yellow ? colors.pale : colors.blue }]}>
    <Text style={{ color: green ? colors.green : red ? colors.red : yellow ? '#805b08' : colors.navy, fontSize: 11, fontWeight: '700' }}>{labels[value] || value}</Text>
  </View>;
}
export function Avatar({ person, size = 34 }: { person?: { avatar?: string; name?: string } | null; size?: number }) {
  const style = [s.avatar, { width: size, height: size, borderRadius: size / 2 }];
  const letters = (person?.name || '').trim().split(/\s+/).slice(-2).map(word => word[0] || '').join('');
  return person?.avatar ? <Image source={{ uri: person.avatar }} style={style} accessibilityLabel={'Ảnh đại diện ' + person.name} /> :
    <View style={style}><Text style={[s.bold, { fontSize: size > 40 ? 18 : 11 }]}>{letters || '?'}</Text></View>;
}
export function Cover({ post, large = false }: { post: Post; large?: boolean }) {
  const style = [s.thumb, large && s.bigThumb];
  if (post.cover) return <Image source={{ uri: post.cover }} style={style} accessibilityLabel={'Ảnh bìa ' + post.title} resizeMode={large ? 'contain' : 'cover'} />;
  return <View style={style}>
    <Icon name={post.type === 'digital' ? 'document-text-outline' : 'book-outline'} size={large ? 46 : 18} color={large ? colors.yellow : colors.navy} />
    <Text style={large ? s.previewTitle : s.thumbText}>{large ? post.title : post.type === 'digital' ? 'PDF' : 'BẢN IN'}</Text>
  </View>;
}
export function Search({ value, onChange, placeholder, onSubmit }: { value: string; onChange: (text: string) => void; placeholder: string; onSubmit?: () => void }) {
  return <View style={s.search}><Icon name="search-outline" size={17} /><TextInput value={value} onChangeText={onChange}
    accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={colors.muted} maxLength={130}
    returnKeyType="search" onSubmitEditing={onSubmit} style={s.searchInput} /></View>;
}
export function Field({ label, value, onChange, multiline, secret }: { label: string; value: string; onChange: (text: string) => void; multiline?: boolean; secret?: boolean }) {
  return <View style={s.field}><Text style={s.bold}>{label}</Text><TextInput accessibilityLabel={label} placeholder={label}
    placeholderTextColor={colors.muted} value={value} onChangeText={onChange} multiline={multiline} secureTextEntry={secret}
    autoCapitalize={secret ? 'none' : 'sentences'} style={[s.input, multiline && s.multiline]} /></View>;
}
export function Choices({ options, selected, choose }: { options: { key: string; label: string }[]; selected: string; choose: (key: string) => void }) {
  return <View style={s.wrap}>{options.map(({ key, label }) => <Pressable key={key} accessibilityRole="button"
    accessibilityState={{ selected: key === selected }} onPress={() => choose(key)} style={[s.choice, key === selected && s.choiceActive]}>
    <Text style={[s.choiceText, key === selected && s.choiceTextActive]}>{label}</Text></Pressable>)}</View>;
}
export function MetricGrid({ items, wide }: { items: { title: string; value: string | number; hint?: string; icon?: IconName }[]; wide: boolean }) {
  return <View style={[s.metricGrid, wide && s.metricWide]}>{items.map(({ title, value, hint, icon }) => <View key={title} style={[s.metric, wide && { flexBasis: 0 }]}>
    <View style={s.between}><Text style={[s.muted, s.flex]}>{title}</Text>{icon && <View style={s.metricIcon}><Icon name={icon} size={17} /></View>}</View>
    <Text style={s.metricValue}>{typeof value === 'number' ? number(value) : value}</Text>
    {!!hint && <Text style={s.hint}>{hint}</Text>}
  </View>)}</View>;
}
export function Chart({ rows, both }: { rows: Stats['timeline']; both?: boolean }) {
  const max = Math.max(1, ...rows.flatMap(row => both ? [row.members, row.posts] : [row.members]));
  return <>
    <View style={s.wrap}>{both && <Text style={s.muted}>● Thành viên</Text>}<Text style={s.legend}>{both ? '● Tài liệu đã duyệt' : '● Thành viên mới'}</Text></View>
    <View style={s.chart}>
      <View pointerEvents="none" style={s.chartLines}>{[0, 1, 2, 3].map(n => <View key={n} style={s.chartLine} />)}</View>
      {rows.map((row, i) => <View key={row.date} style={s.chartColumn} accessible
        accessibilityLabel={row.date + ', ' + row.members + ' thành viên' + (both ? ', ' + row.posts + ' tài liệu' : '')}>
        <View style={s.bars}>
          <View style={[s.bar, { height: row.members ? Math.max(2, row.members / max * 95) : 0, backgroundColor: both ? colors.navy : colors.yellow }]} />
          {both && <View style={[s.bar, { height: row.posts ? Math.max(2, row.posts / max * 95) : 0, backgroundColor: colors.yellow }]} />}
        </View>
        <Text style={s.chartDate}>{rows.length <= 7 || i % 7 === 0 || i === rows.length - 1 ? row.date.slice(8) + '/' + row.date.slice(5, 7) : ''}</Text>
      </View>)}
    </View>
  </>;
}
export function Pagination({ page, total, limit, go }: { page: number; total: number; limit: number; go: (n: number) => void }) {
  const first = (page - 1) * limit + 1;
  return <View style={s.between}><Text style={s.muted}>{total ? first + '–' + Math.min(page * limit, total) + ' trong ' + number(total) : '0 kết quả'}</Text>
    <View style={s.wrap}>
      <Action label="Trước" icon="chevron-back" disabled={page <= 1} onPress={() => go(page - 1)} />
      <Action label="Sau" icon="chevron-forward" disabled={page * limit >= total} onPress={() => go(page + 1)} />
    </View>
  </View>;
}
export function Empty({ label }: { label: string }) {
  return <View style={s.empty}><Icon name="folder-open-outline" size={25} /><Text style={s.muted}>{label}</Text></View>;
}
export const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stack: { gap: 12 },
  title: { fontSize: 28, color: colors.ink, fontWeight: '800', letterSpacing: -0.65 },
  h2: { fontSize: 17, fontWeight: '800', color: colors.ink },
  bold: { fontSize: 14, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  body: { fontSize: 14, color: colors.navy, lineHeight: 21 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, color: colors.muted },
  panel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 16, gap: 14, minWidth: 0 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 39, gap: 6,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  strong: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  danger: { backgroundColor: colors.pink, borderColor: colors.pink },
  textAction: { backgroundColor: 'transparent', borderColor: 'transparent', paddingHorizontal: 4 },
  actionText: { fontSize: 12, color: colors.navy, fontWeight: '700' },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  thumb: { width: 38, height: 48, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, gap: 2 },
  thumbText: { fontSize: 7, fontWeight: '800', color: colors.navy },
  bigThumb: { width: '100%', height: 215, backgroundColor: colors.navy, gap: 14, padding: 22, borderRadius: 12 },
  previewTitle: { color: colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  pill: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  search: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 42, borderWidth: 1, borderColor: colors.line,
    borderRadius: 9, backgroundColor: colors.white, paddingHorizontal: 11 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 13, minHeight: 40, color: colors.ink },
  field: { gap: 5 },
  input: { fontSize: 14, borderWidth: 1, minHeight: 42, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 11, color: colors.ink },
  multiline: { minHeight: 78, paddingVertical: 10, textAlignVertical: 'top' },
  choice: { borderRadius: 8, minHeight: 36, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  choiceActive: { backgroundColor: colors.pale, borderColor: '#f2da7c' },
  choiceText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  choiceTextActive: { color: '#6b4a06' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricWide: { flexWrap: 'nowrap' },
  metric: { flexBasis: '46%', flexGrow: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.line, gap: 4, padding: 12, backgroundColor: colors.white, minHeight: 89 },
  metricValue: { color: colors.navy, fontSize: 25, fontWeight: '800' },
  metricIcon: { padding: 6, borderRadius: 7, backgroundColor: colors.pale },
  hint: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  legend: { color: '#805b08', fontSize: 12 },
  chart: { flexDirection: 'row', position: 'relative', height: 126, alignItems: 'flex-end', gap: 3 },
  chartColumn: { flex: 1, minWidth: 0, alignItems: 'center', gap: 5 },
  bars: { flexDirection: 'row', width: '84%', height: 101, alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  bar: { flex: 1, maxWidth: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  chartDate: { minHeight: 16, color: colors.muted, fontSize: 9 },
  chartLines: { position: 'absolute', top: 6, bottom: 20, left: 0, right: 0, justifyContent: 'space-between' },
  chartLine: { height: 1, backgroundColor: colors.line },
  empty: { alignItems: 'center', gap: 8, padding: 22 },
});
