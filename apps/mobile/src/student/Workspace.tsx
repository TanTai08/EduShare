import type { ComponentProps, ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PublicUser } from '../../../../packages/contracts';

export type Glyph = ComponentProps<typeof Ionicons>['name'];
export const palette = { navy: '#203448', ink: '#171b20', muted: '#586474', yellow: '#ffcd12', line: '#e0e8f1', surface: '#fff', canvas: '#f8fafb', soft: '#f0f3f6', pale: '#fff4c2' };
export type Destination = { key: string; label: string; icon: Glyph; open: () => void };
export type Search = { value: string; change: (value: string) => void; submit: () => void };
export const pageMargins = { width: '100%' as const, maxWidth: 1600, alignSelf: 'center' as const, paddingHorizontal: '4.45%' as const };
export const panel = { backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 12, minWidth: 0 };
export const column = { gap: 16, minWidth: 0 };

export function WebButton({ title, onPress, icon, primary = false, disabled = false }: { title: string; onPress: () => void; icon?: Glyph; primary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
    ui.button, primary && ui.primary, hovered && (primary ? ui.primaryHover : ui.hover), (pressed || disabled) && ui.pressed,
  ]}>
    {icon && <Ionicons name={icon} size={16} color={palette.ink} />}
    <Text style={ui.buttonText}>{title}</Text>
  </Pressable>;
}

export function Workspace({ children, active, destinations, user, notifications, account, register, search }: {
  children: ReactNode; active: string; destinations: Destination[]; user: PublicUser | null;
  notifications: () => void; account: () => void; register: () => void; search: Search;
}) {
  const home = destinations.find(item => item.key === 'home');
  const publish = destinations.find(item => item.key === 'publish');
  return <View style={ui.workspace}>
    <View style={ui.bar}>
      <View style={ui.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="EduShare · Khám phá" style={ui.brand} onPress={home?.open}>
          <View style={ui.logo}><Ionicons name="book-outline" size={17} color={palette.ink} /></View>
          <Text style={ui.brandText}>EduShare</Text>
        </Pressable>
        <View role="navigation" accessibilityLabel="Điều hướng EduShare" style={ui.nav}>
          {['home', 'saved', 'deals', 'inbox'].map(key => {
            const item = destinations.find(destination => destination.key === key);
            if (!item) return null;
            return <Pressable key={key} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: key === active }}
              onPress={item.open} style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [ui.navItem, hovered && ui.hover, key === active && ui.selected]}>
              <Text style={ui.buttonText}>{item.label}</Text>
            </Pressable>;
          })}
        </View>
        <View style={ui.search}><Ionicons name="search-outline" size={18} color={palette.navy} />
          <TextInput accessibilityLabel="Tìm tài liệu" placeholder="Tìm tài liệu, môn học…" returnKeyType="search"
            placeholderTextColor={palette.muted} value={search.value} onChangeText={search.change} onSubmitEditing={search.submit} style={ui.searchInput} />
          {!!search.value && <Pressable accessibilityRole="button" accessibilityLabel="Xóa từ khóa" onPress={() => search.change('')}>
            <Ionicons name="close-circle-outline" size={17} color={palette.muted} /></Pressable>}
        </View>
        {!!publish && <WebButton title="Đăng tài liệu" icon="add" primary onPress={publish.open} />}
        {user ? <>
          <Pressable accessibilityRole="button" accessibilityLabel="Thông báo" onPress={notifications} style={ui.bell}>
            <Ionicons name="notifications-outline" size={20} color={palette.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Tài khoản" onPress={account} style={ui.identity}>
            {user.avatar && <Image source={{ uri: user.avatar }} style={ui.avatar} />}
            <Text style={ui.buttonText}>Tài khoản</Text>
          </Pressable>
        </> : <View style={ui.auth}><WebButton title="Đăng nhập" onPress={account} /><WebButton title="Đăng ký" onPress={register} /></View>}
      </View>
    </View>
    {children}
  </View>;
}

export function WebFooter({ home, help }: { home: () => void; help: () => void }) {
  return <View style={ui.bar}>
    <View style={ui.footer}>
      <Text style={ui.footerText}>EduShare  ·  Học cùng cộng đồng sinh viên</Text>
      <View style={ui.nav}>
        <Pressable accessibilityRole="button" onPress={help}><Text style={ui.footerText}>Trợ lý AI</Text></Pressable>
        <Text style={ui.footerText}>·</Text>
        <Pressable accessibilityRole="button" onPress={home}><Text style={ui.footerText}>Cộng đồng</Text></Pressable>
      </View>
    </View>
  </View>;
}

const ui = StyleSheet.create({
  workspace: { flex: 1, minWidth: 0, backgroundColor: palette.canvas },
  bar: { backgroundColor: 'white' },
  header: { ...pageMargins, minHeight: 82, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', paddingVertical: 12, gap: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 7 },
  logo: { width: 30, height: 30, borderRadius: 8, backgroundColor: palette.yellow, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: palette.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.45 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navItem: { paddingHorizontal: 10, paddingVertical: 10, justifyContent: 'center', borderRadius: 8 },
  selected: { backgroundColor: palette.pale },
  search: { flex: 1, minWidth: 125, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: palette.soft, borderRadius: 9, paddingHorizontal: 11 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 43, fontSize: 13, color: palette.ink },
  bell: { padding: 7 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  auth: { flexDirection: 'row', gap: 5 },
  button: { minHeight: 41, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: palette.soft },
  buttonText: { fontSize: 13, fontWeight: '700', color: palette.ink },
  primary: { backgroundColor: palette.yellow },
  primaryHover: { backgroundColor: '#ffda4b' },
  hover: { backgroundColor: '#e5ecf1' },
  pressed: { opacity: 0.58 },
  footer: { ...pageMargins, minHeight: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  footerText: { color: palette.muted, fontSize: 13 },
});
