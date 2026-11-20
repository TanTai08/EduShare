import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Listing, PublicUser } from '../../../../packages/contracts';
import { styles } from './styles';

export function Button({ caption, onPress, alt = false, fill = false }: { caption: string; onPress: () => void; alt?: boolean; fill?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, alt && styles.alt, fill && styles.flex]}><Text style={styles.bold}>{caption}</Text></Pressable>;
}
export function Field({ label, value, change, secret = false }: { label: string; value: string; change: (s: string) => void; secret?: boolean }) {
  return <View style={styles.field}><Text style={styles.small}>{label}</Text><TextInput accessibilityLabel={label} placeholder={label} autoCapitalize="none" secureTextEntry={secret} value={value} onChangeText={change} style={styles.input} /></View>;
}
export function Avatar({ user, large = false }: { user: PublicUser; large?: boolean }) {
  return user.avatar ? <Image source={{ uri: user.avatar }} style={[styles.avatar, large && styles.largeAvatar]} /> : <View style={[styles.avatar, large && styles.largeAvatar]}><Text style={styles.bold}>{user.name.slice(0, 1)}</Text></View>;
}
export function Cover({ doc, wide = false, hero = false, desktop = false }: { doc: Listing; wide?: boolean; hero?: boolean; desktop?: boolean }) {
  const size = [styles.cover, wide && styles.wideCover, hero && styles.detailCover, desktop && styles.desktopCover];
  return doc.cover ? <Image source={{ uri: doc.cover }} resizeMode={desktop ? 'contain' : 'cover'} style={size} /> : <View style={[size, { backgroundColor: desktop ? (doc.type === 'sale' ? '#fff0c5' : doc.type === 'points' ? '#e0f3e9' : '#eee8fb') : (doc.type === 'sale' ? '#234569' : doc.type === 'points' ? '#355D53' : '#554579') }]}><Ionicons name="book-outline" color={desktop ? "#826009" : "#ffdc55"} size={desktop ? 48 : 24} /><Text style={[styles.coverTitle, desktop && styles.desktopCoverTitle]} numberOfLines={3}>{doc.title}</Text></View>;
}
export function AccountRow({ glyph, caption, press }: { glyph: React.ComponentProps<typeof Ionicons>['name']; caption: string; press: () => void }) {
  return <Pressable accessibilityRole="button" style={styles.accountRow} onPress={press}>
    <Ionicons name={glyph} size={20} color="#33599e" /><Text style={[styles.bold, styles.flex]}>{caption}</Text><Ionicons name="chevron-forward" size={15} color="#171815" />
  </Pressable>;
}
export function HomeTile({ name, glyph, color, circle, active, press }: { name: string; glyph: React.ComponentProps<typeof Ionicons>['name']; color: string; circle?: boolean; active?: boolean; press: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: Boolean(active) }} onPress={press} style={styles.tile}>
    <View style={[styles.tileIcon, { backgroundColor: color }, circle && styles.circle, active && styles.tileSelected]}>
      <Ionicons name={glyph} size={21} color="#203448" />
    </View>
    <Text style={styles.tileText}>{name}</Text>
  </Pressable>;
}
export function Nav({ icon, label, press }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; press: () => void }) {
  return <Pressable accessibilityRole="button" onPress={press} style={styles.navItem}><Ionicons name={icon} size={21} color="#213347" /><Text style={styles.small}>{label}</Text></Pressable>;
}
