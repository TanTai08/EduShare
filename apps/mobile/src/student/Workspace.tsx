import type { ComponentProps, ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PublicUser } from '../../../../packages/contracts';

export type Glyph = ComponentProps<typeof Ionicons>['name'];
export const palette = { navy: '#203448', ink: '#172a41', muted: '#516478', yellow: '#ffcd12', line: '#e7dfce', surface: '#fff', canvas: '#fcfaf5' };
export type Destination = { key: string; label: string; icon: Glyph; open: () => void };
export type Search = { value: string; change: (value: string) => void; submit: () => void };

export function WebButton({ title, onPress, icon, primary = false }: { title: string; onPress: () => void; icon?: Glyph; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
    ui.button, primary && ui.primary, hovered && (primary ? ui.primaryHover : ui.hover), pressed && ui.pressed,
  ]}>
    {icon && <Ionicons name={icon} size={17} color={palette.navy} />}
    <Text style={ui.buttonText}>{title}</Text>
  </Pressable>;
}

export function Workspace({ children, title, active, destinations, user, region, home, changeRegion, notifications, account, register, search }: {
  children: ReactNode; title: string; active: string; destinations: Destination[]; user: PublicUser | null; region: string;
  home: () => void; changeRegion: () => void; notifications: () => void; account: () => void; register: () => void; search: Search;
}) {
  return <View style={ui.workspace}>
    <View role="navigation" accessibilityLabel="Điều hướng EduShare" style={ui.rail}>
      <Pressable accessibilityRole="button" accessibilityLabel="EduShare · Trang chủ" style={ui.brand} onPress={home}>
        <View style={ui.logo}><Ionicons name="book-outline" size={22} color={palette.navy} /></View>
        <Text style={ui.brandText}>EduShare</Text>
      </Pressable>
      <View style={ui.navigation}>
        {destinations.map(item => {
          const isActive = item.key === active;
          return <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: isActive }}
            onPress={item.open} style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [ui.navItem, hovered && ui.navHover, isActive && ui.navActive, pressed && ui.pressed]}>
            <Ionicons name={item.icon} size={19} color={palette.navy} />
            <Text style={[ui.navText, isActive && ui.navTextActive]}>{item.label}</Text>
          </Pressable>;
        })}
      </View>
      <View style={ui.railSpacer} />
      <Pressable accessibilityRole="button" accessibilityLabel={'Đổi khu vực · ' + region} onPress={changeRegion} style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [ui.location, hovered && ui.navHover]}>
        <Ionicons name="location-outline" size={19} color={palette.yellow} /><View style={ui.flex}><Text style={ui.locationLabel}>Khu vực giao nhận</Text>
          <Text style={ui.locationText}>{region}</Text></View><Ionicons name="chevron-forward" size={15} color={palette.muted} />
      </Pressable>
    </View>
    <View style={ui.main}>
      <View style={ui.header}>
        <View style={ui.breadcrumb}><Text style={ui.breadcrumbLabel}>EduShare</Text><Ionicons name="chevron-forward" size={13} color={palette.muted} />
          <Text numberOfLines={1} style={ui.breadcrumbTitle}>{title}</Text></View>
        <View style={ui.search}><Ionicons name="search-outline" size={19} color={palette.navy} />
          <TextInput accessibilityLabel="Tìm tài liệu" placeholder="Tìm tài liệu, môn học hoặc trường…" returnKeyType="search"
            placeholderTextColor={palette.muted} value={search.value} onChangeText={search.change} onSubmitEditing={search.submit} style={ui.searchInput} />
          {!!search.value && <Pressable accessibilityRole="button" accessibilityLabel="Xóa từ khóa" onPress={() => search.change('')} style={ui.clear}>
            <Ionicons name="close-circle-outline" size={18} color={palette.muted} /></Pressable>}
        </View>
        {user ? <>
          <Pressable accessibilityRole="button" accessibilityLabel="Thông báo" onPress={notifications} style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [ui.bell, hovered && ui.hover]}>
            <Ionicons name="notifications-outline" size={21} color={palette.navy} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mở tài khoản" onPress={account} style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [ui.identity, hovered && ui.hover]}>
            {user.avatar ? <Image source={{ uri: user.avatar }} style={ui.avatar} /> : <View style={ui.avatar}>
              <Text style={ui.buttonText}>{user.name.trim().slice(0, 1).toUpperCase()}</Text>
            </View>}
            <Text numberOfLines={1} style={ui.identityName}>{user.name}</Text>
            <Ionicons name="chevron-down" size={13} color={palette.muted} />
          </Pressable>
        </> : <View style={ui.auth}><WebButton title="Đăng nhập" onPress={account} /><WebButton title="Đăng ký" primary onPress={register} /></View>}
      </View>
      {children}
    </View>
  </View>;
}

const ui = StyleSheet.create({
  workspace: { flex: 1, flexDirection: 'row', backgroundColor: palette.canvas },
  rail: { flexBasis: 224, backgroundColor: '#fffdf7', borderRightWidth: 1, borderColor: palette.line, padding: 16, paddingTop: 24, gap: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 7, paddingVertical: 4 },
  logo: { width: 38, height: 38, borderRadius: 11, backgroundColor: palette.yellow, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: palette.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.6 },
  navigation: { gap: 6 },
  navItem: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderRadius: 9 },
  navHover: { backgroundColor: '#f3ead7' },
  navActive: { backgroundColor: '#fff0b6' },
  navText: { fontWeight: '700', color: palette.ink, fontSize: 14 },
  navTextActive: { color: palette.ink },
  railSpacer: { flex: 1 },
  location: { minHeight: 64, backgroundColor: '#f7efde', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 11, padding: 10 },
  locationLabel: { color: palette.muted, fontSize: 11 },
  locationText: { color: palette.ink, fontSize: 14, fontWeight: '800', marginTop: 2 },
  flex: { flex: 1, minWidth: 0 },
  main: { flex: 1, minWidth: 0, backgroundColor: palette.canvas },
  header: { minHeight: 72, backgroundColor: 'white', borderBottomWidth: 1, borderColor: palette.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 23, gap: 12 },
  breadcrumb: { flexBasis: 120, flexGrow: 1, flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  breadcrumbLabel: { color: palette.muted, fontSize: 13 },
  breadcrumbTitle: { color: palette.ink, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  search: { flex: 2, maxWidth: 410, minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: palette.line, backgroundColor: '#faf7ee', borderRadius: 9, paddingHorizontal: 11 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 40, fontSize: 13, color: palette.ink },
  clear: { padding: 3 },
  bell: { padding: 9, borderRadius: 9 },
  identity: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7, padding: 4, borderRadius: 9 },
  identityName: { maxWidth: 104, fontSize: 13, fontWeight: '700', color: palette.ink },
  avatar: { width: 33, height: 33, borderRadius: 17, backgroundColor: '#fff2bd', justifyContent: 'center', alignItems: 'center' },
  auth: { flexDirection: 'row', gap: 7 },
  button: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: palette.line, backgroundColor: 'white' },
  buttonText: { fontSize: 13, fontWeight: '800', color: palette.ink },
  primary: { backgroundColor: palette.yellow, borderColor: palette.yellow },
  primaryHover: { backgroundColor: '#ffda4b' },
  hover: { backgroundColor: '#f7f0df' },
  pressed: { opacity: 0.8 },
});
