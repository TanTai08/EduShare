import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listingLabels, type Listing, type ListingType } from '../../../../packages/contracts';
import { WebButton, palette, type Glyph } from './Workspace';

const types = {
  sale: { label: 'Mua bán', hint: 'Sách và giáo trình bản in', icon: 'bag-handle-outline', color: '#fff1bf' },
  points: { label: 'Đổi điểm', hint: 'Dùng điểm nhận bản in', icon: 'swap-horizontal-outline', color: '#e6eeff' },
  digital: { label: 'Miễn phí', hint: 'Đề thi, đề cương và PDF', icon: 'document-text-outline', color: '#e2f4e9' },
} satisfies Record<ListingType, { label: string; hint: string; icon: Glyph; color: string }>;
const categories: { label: string; icon: Glyph }[] = [
  { label: 'Sách', icon: 'book-outline' }, { label: 'Giáo trình', icon: 'library-outline' },
  { label: 'Slide', icon: 'easel-outline' }, { label: 'Đề thi', icon: 'clipboard-outline' },
  { label: 'Đề cương', icon: 'list-outline' }, { label: 'File PDF', icon: 'document-outline' },
];
const covers: Record<ListingType, { background: string; light: string }> = {
  sale: { background: '#1f3f5d', light: '#badcea' },
  points: { background: '#23544c', light: '#b9e4cc' },
  digital: { background: '#483d6f', light: '#dcd1fa' },
};
const heroFade = { backgroundImage: 'linear-gradient(90deg, #203448 0%, rgba(32, 52, 72, 0) 100%)' } as ViewStyle;
export function listingCardBasis(width: number) {
  return width >= 1360 ? '23.8%' : width >= 1170 ? '32%' : '48.5%';
}
type Props = {
  rows: Listing[]; status: 'loading' | 'ready' | 'error'; width: number; region: string; filter: ListingType | '';
  keyword: string; category: string; onCategory: (value: string) => void; onFilter: (type: ListingType) => void;
  onReset: () => void; onRetry: () => void; onChat: () => void; onRegion: () => void;
  onAssistant: () => void; onCatalogLayout: (offset: number) => void; onBrowse: () => void; onOpen: (row: Listing) => void;
};

function Tile({ label, hint, icon, color, active, onPress }: {
  label: string; hint: string; icon: Glyph; color: string; active?: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={active === undefined ? undefined : { selected: active }}
    onPress={onPress} style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [s.tile, hovered && s.tileHover, active && s.active, pressed && s.pressed]}>
    <View style={[s.tileIcon, { backgroundColor: color }]}><Ionicons name={icon} size={21} color={palette.navy} /></View>
    <View style={s.flex}><Text style={s.bold}>{label}</Text><Text numberOfLines={2} style={s.hint}>{hint}</Text></View>
  </Pressable>;
}

export function ListingCard({ item, onOpen, size }: { item: Listing; onOpen: () => void; size: ReturnType<typeof listingCardBasis> }) {
  const color = covers[item.type];
  const cost = item.type === 'digital' ? 'Miễn phí' : item.price.toLocaleString('vi-VN') + (item.type === 'sale' ? ' ₫' : ' điểm');
  return <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={onOpen}
    style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [s.card, { flexBasis: size }, hovered && s.cardHover, pressed && s.pressed]}>
    <View style={[s.cardArt, { backgroundColor: color.background }]}>
      {item.cover ? <Image source={{ uri: item.cover }} style={s.photo} resizeMode="cover" /> : <>
        <View style={[s.artRing, { borderColor: color.light }]} /><View style={[s.artRingSmall, { borderColor: color.light }]} />
        <View style={s.artCopy}><Text numberOfLines={1} style={[s.artCategory, { color: color.light }]}>{item.category}</Text>
          <Text numberOfLines={2} style={s.artTitle}>{item.title}</Text></View>
        <View style={s.artIcon}><Ionicons name={types[item.type].icon} size={25} color={color.light} /></View>
      </>}
    </View>
    <View style={s.cardBody}>
      {(item.cover || item.category) && <Text numberOfLines={1} style={s.cardCategory}>{item.cover ? item.category : listingLabels[item.type]}</Text>}
      <Text numberOfLines={2} style={s.cardTitle}>{item.title}</Text>
      <View style={s.owner}>
        {item.owner?.avatar ? <Image source={{ uri: item.owner.avatar }} style={s.avatar} /> : <View style={s.avatar}>
          <Text style={s.avatarText}>{item.owner?.name?.trim().slice(0, 1).toUpperCase() || '?'}</Text>
        </View>}
        <View style={s.flex}><Text numberOfLines={1} style={s.ownerName}>{item.owner?.name || 'Người đăng'}</Text>
          {!!item.owner?.school && <Text numberOfLines={1} style={s.hint}>{item.owner.school}</Text>}</View>
      </View>
      <View style={s.cardFoot}><Text style={[s.cost, item.type === 'digital' && s.free]}>{cost}</Text>
        <Ionicons name="arrow-forward" size={17} color={palette.navy} /></View>
    </View>
  </Pressable>;
}

export function LibraryHome({ rows, status, width, region, filter, keyword, category, onCategory, onFilter, onReset, onRetry, onChat, onRegion, onAssistant, onBrowse, onCatalogLayout, onOpen }: Props) {
  const active = !!(filter || keyword.trim() || category);
  const size = listingCardBasis(width);
  return <>
    {!active && <View style={s.heroGroup}>
      <View style={s.hero}>
        <Image accessibilityIgnoresInvertColors source={require('../../assets/library-hero.webp')} style={s.heroImage} resizeMode="cover" />
        <View pointerEvents="none" style={[s.heroFade, heroFade]} />
        <View style={s.heroCopy}>
          <Text accessibilityRole="header" aria-level={1} style={s.heroTitle}>Tủ tài liệu{'\n'}cho kỳ thi</Text>
          <Text style={s.heroText}>Tìm giáo trình, đề thi và slide từ cộng đồng sinh viên.</Text>
          <View style={s.start}><WebButton title="Khám phá tài liệu" icon="arrow-forward" primary onPress={onBrowse} /></View>
        </View>
      </View>
      {width >= 1120 && <View style={s.side}>
        <View style={s.sideIcon}><Ionicons name="sparkles-outline" color={palette.navy} size={23} /></View>
        <Text accessibilityRole="header" style={s.sideTitle}>Trợ lý AI</Text>
        <Text style={s.sideText}>Hỏi về tài liệu trong EduShare và tìm gợi ý theo môn học.</Text>
        <View style={s.start}><WebButton title="Hỏi trợ lý" onPress={onAssistant} /></View>
      </View>}
    </View>}
    <View style={s.shortcuts}>
      {(Object.keys(types) as ListingType[]).map(type => <Tile key={type} {...types[type]} active={filter === type} onPress={() => onFilter(type)} />)}
      <Tile label="Tin nhắn" hint="Trao đổi với người đăng" icon="chatbubbles-outline" color="#eee7ff" onPress={onChat} />
    </View>
    <View style={s.categories}>
      <Text accessibilityRole="header" style={s.sectionTitle}>Danh mục</Text>
      <View style={s.categoryRow}>{categories.map(item => {
        const selected = item.label === 'File PDF' ? filter === 'digital' : item.label === category;
        return <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected }}
          key={item.label} onPress={() => item.label === 'File PDF' ? onFilter('digital') : onCategory(item.label)}
          style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [s.categoryButton, hovered && s.tileHover, selected && s.active]}>
          <Ionicons name={item.icon} size={16} color={palette.navy} /><Text style={s.bold}>{item.label}</Text>
        </Pressable>;
      })}</View>
    </View>
    <View onLayout={event => onCatalogLayout(event.nativeEvent.layout.y)} style={s.catalogHeader}>
      <View style={s.flex}>
        <Text accessibilityRole="header" style={s.sectionTitle}>{keyword.trim() ? 'Kết quả tìm kiếm' : category || (filter ? listingLabels[filter] : 'Tài liệu nổi bật')}</Text>
        {status === 'ready' && <Text aria-live="polite" style={s.hint}>{rows.length} tài liệu{keyword.trim() ? ' cho “' + keyword.trim() + '”' : ''}</Text>}
      </View>
      {active && <WebButton title="Xóa bộ lọc" icon="close-outline" onPress={onReset} />}
      <WebButton title={region} icon="location-outline" onPress={onRegion} />
    </View>
    {status === 'loading' ? <View style={s.empty}><ActivityIndicator accessibilityLabel="Đang tải tài liệu" color={palette.navy} /></View> :
      status === 'error' ? <View style={s.empty}><Ionicons name="cloud-offline-outline" size={27} color={palette.muted} />
        <Text style={s.bold}>Chưa tải được danh sách tài liệu</Text><WebButton title="Thử lại" onPress={onRetry} /></View> :
      rows.length ? <View style={s.cards}>{rows.map(item => <ListingCard key={item.id} item={item} size={size} onOpen={() => onOpen(item)} />)}</View> :
      <View style={s.empty}><Ionicons name="folder-open-outline" size={27} color={palette.muted} />
        <Text style={s.bold}>{active ? 'Chưa có tài liệu phù hợp' : 'Chưa có tài liệu được duyệt'}</Text>
        <Text style={s.hint}>{active ? 'Thử từ khóa khác hoặc xóa bộ lọc.' : 'Tài liệu sẽ xuất hiện sau khi được duyệt.'}</Text></View>}
  </>;
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  start: { alignSelf: 'flex-start' },
  heroGroup: { flexDirection: 'row', gap: 15 },
  hero: { flex: 1, minWidth: 0, minHeight: 222, borderRadius: 14, overflow: 'hidden', position: 'relative', backgroundColor: palette.navy, justifyContent: 'center' },
  heroImage: { position: 'absolute', right: 0, top: 0, bottom: 0, height: '100%', width: '57%' },
  heroFade: { position: 'absolute', left: '42.9%', top: 0, bottom: 0, width: '21%' },
  heroCopy: { width: '52%', paddingVertical: 19, paddingHorizontal: 23, gap: 10, alignItems: 'flex-start' },
  heroTitle: { fontSize: 31, lineHeight: 34, color: 'white', fontWeight: '900', letterSpacing: -0.8 },
  heroText: { fontSize: 13, color: '#dce8f2', lineHeight: 19 },
  side: { flexBasis: 212, borderRadius: 14, backgroundColor: '#fff4ce', borderWidth: 1, borderColor: '#f4e3a1', padding: 16, gap: 8, justifyContent: 'center' },
  sideIcon: { width: 42, height: 42, backgroundColor: '#ffdf67', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sideTitle: { fontSize: 19, fontWeight: '900', color: palette.ink },
  sideText: { fontSize: 13, lineHeight: 19, color: '#514b3e' },
  shortcuts: { flexDirection: 'row', gap: 9 },
  tile: { flex: 1, minWidth: 0, padding: 9, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, backgroundColor: 'white', borderColor: palette.line, borderWidth: 1 },
  tileHover: { backgroundColor: '#eef4fa', borderColor: '#c9d7e7' },
  pressed: { opacity: 0.84 },
  active: { backgroundColor: '#fff8dd', borderColor: '#edcc52' },
  tileIcon: { width: 37, height: 37, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bold: { color: palette.ink, fontSize: 13, fontWeight: '800' },
  hint: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  categories: { gap: 9 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { minHeight: 37, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11,
    backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 9 },
  sectionTitle: { color: palette.ink, fontSize: 21, fontWeight: '900', letterSpacing: -0.3 },
  catalogHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '1.5%', rowGap: 13 },
  card: { minWidth: 0, borderRadius: 12, overflow: 'hidden', backgroundColor: 'white', borderColor: palette.line, borderWidth: 1 },
  cardHover: { borderColor: '#a9bcd4', shadowColor: palette.navy, shadowOpacity: 0.13, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  cardArt: { height: 123, position: 'relative', justifyContent: 'center', overflow: 'hidden' },
  photo: { height: '100%', width: '100%' },
  artRing: { position: 'absolute', width: 138, height: 138, borderRadius: 69, borderWidth: 1, right: -30, top: -5, opacity: 0.45 },
  artRingSmall: { position: 'absolute', width: 94, height: 94, borderRadius: 47, borderWidth: 1, right: -8, top: 17, opacity: 0.45 },
  artCopy: { width: '72%', paddingLeft: 15, gap: 5 },
  artCategory: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  artTitle: { fontSize: 16, lineHeight: 20, fontWeight: '900', color: 'white' },
  artIcon: { position: 'absolute', right: 14, bottom: 13 },
  cardBody: { padding: 12, gap: 7, flex: 1 },
  cardCategory: { color: palette.muted, fontSize: 11, fontWeight: '700' },
  cardTitle: { color: palette.ink, fontSize: 14, lineHeight: 18, fontWeight: '900', minHeight: 36 },
  owner: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ownerName: { color: palette.ink, fontSize: 12, fontWeight: '700' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5edfa' },
  avatarText: { fontSize: 11, fontWeight: '800', color: palette.navy },
  cardFoot: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: palette.line, paddingTop: 8 },
  cost: { color: '#805b08', fontSize: 14, fontWeight: '900' },
  free: { color: '#196846' },
  empty: { gap: 8, padding: 24, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: palette.line, alignItems: 'center' },
});
