import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listingLabels, type Listing, type ListingType } from '../../../../packages/contracts';
import { WebButton, palette, panel, column, type Glyph } from './Workspace';

const types = {
  sale: { label: 'Mua bán', hint: 'Giáo trình bản in tại trường', icon: 'bag-handle-outline', tone: '#fff0ba', ink: '#806211', stage: '#e8eef8', cover: '#182951' },
  points: { label: 'Đổi điểm', hint: 'Đổi tri thức, nhận tài liệu', icon: 'swap-horizontal-outline', tone: '#dde9ff', ink: '#3e69a8', stage: '#eee8fa', cover: '#402568' },
  digital: { label: 'Miễn phí', hint: 'Học thêm với PDF miễn phí', icon: 'download-outline', tone: '#ddf5e6', ink: '#16734c', stage: '#e1f2ed', cover: '#145352' },
} satisfies Record<ListingType, { label: string; hint: string; icon: Glyph; tone: string; ink: string; stage: string; cover: string }>;
const categories: { label: string; icon: Glyph; tone: string }[] = [
  { label: 'Sách', icon: 'book-outline', tone: '#fcebc2' }, { label: 'Giáo trình', icon: 'document-text-outline', tone: '#dae9f1' },
  { label: 'Slide', icon: 'easel-outline', tone: '#e9e2fa' }, { label: 'Đề thi', icon: 'clipboard-outline', tone: '#fce3df' },
  { label: 'File PDF', icon: 'download-outline', tone: '#dfefe6' },
];

export const cost = (item: Listing) => item.type === 'digital' ? 'Miễn phí' : item.price.toLocaleString('vi-VN') + (item.type === 'sale' ? ' ₫' : ' điểm');
export const fold = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('đ', 'd');

export function WebCover({ item, size = 'normal' }: { item: Listing; size?: 'normal' | 'small' | 'medium' | 'large' }) {
  const tone = types[item.type];
  const dimensions = size === 'large' ? s.coverLarge : size === 'small' ? s.coverSmall : size === 'medium' ? s.coverMedium : s.coverNormal;
  return <View style={[s.coverFrame, dimensions, { backgroundColor: tone.cover }]}>
    {item.cover ? <Image accessibilityLabel={'Bìa ' + item.title} source={{ uri: item.cover }} style={s.image} resizeMode="cover" /> : <>
      <View style={[s.ring, { borderColor: tone.tone }]} /><View style={[s.innerRing, { borderColor: tone.tone }]} />
      <Text style={[s.coverTag, { color: tone.tone }]}>{item.type === 'digital' ? 'PDF' : 'BẢN IN'}</Text>
      <Text numberOfLines={3} style={[s.coverTitle, size === 'small' && s.tiny, size === 'large' && s.largeTitle]}>{item.title}</Text>
    </>}
  </View>;
}

type Props = {
  rows: Listing[]; status: 'loading' | 'ready' | 'error'; region: string; filter: ListingType | '';
  keyword: string; category: string; onCategory: (value: string) => void; onFilter: (type: ListingType) => void;
  onReset: () => void; onRetry: () => void; onRegion: () => void; onBrowse: () => void;
  onCatalogLayout: (offset: number) => void; onOpen: (row: Listing) => void;
};

export function LibraryHome({ rows, status, region, filter, keyword, category, onCategory, onFilter, onReset, onRetry, onRegion, onBrowse, onCatalogLayout, onOpen }: Props) {
  const [showAll, setShowAll] = useState(false);
  const filtered = !!(filter || category || keyword.trim());
  const featured = showAll || filtered ? rows : rows.slice(0, 3);
  function browse() { setShowAll(true); onBrowse(); }
  return <>
    <View style={s.between}>
      <Text accessibilityRole="header" aria-level={1} style={s.title}>Khám phá tài liệu cho bạn</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={'Khu vực: ' + region} onPress={onRegion} style={s.row}>
        <Text style={s.muted}>Khu vực: {region}</Text><Ionicons name="chevron-down" color={palette.muted} size={14} />
      </Pressable>
    </View>
    {!filtered && <View style={s.two}>
      <View style={[s.hero, { flex: 3 }]}>
        <View style={s.heroText}>
          <Text style={s.heroKicker}>HỌC CÙNG CỘNG ĐỒNG SINH VIÊN</Text>
          <Text style={s.heroTitle}>Tủ tài liệu{'\n'}cho kỳ thi</Text>
          <Text style={s.heroDescription}>Tìm đúng tài liệu. Chia sẻ tri thức. Cùng nhau tiến bộ.</Text>
          <View style={s.start}><WebButton title="Khám phá ngay" icon="arrow-forward" primary onPress={browse} /></View>
        </View>
        <Image source={require('../../assets/library-hero.webp')} resizeMode="cover" style={s.heroImage} />
      </View>
      <View style={[panel, s.shortcuts]}>
        <Text accessibilityRole="header" style={s.heading}>Bạn muốn làm gì hôm nay?</Text>
        {(Object.keys(types) as ListingType[]).map(key => {
          const item = types[key];
          return <Pressable key={key} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onFilter(key)} style={s.row}>
            <View style={[s.iconTile, { backgroundColor: item.tone }]}><Ionicons name={item.icon} size={19} color={item.ink} /></View>
            <View style={s.flex}><Text style={s.bold}>{item.label}</Text><Text style={s.muted}>{item.hint}</Text></View>
          </Pressable>;
        })}
      </View>
    </View>}
    <View role="group" accessibilityLabel="Danh mục nổi bật" style={s.categoryRow}>
      {categories.map(item => {
        const active = item.label === 'File PDF' ? filter === 'digital' : category === item.label;
        return <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: active }}
          style={[s.category, active && s.active]} onPress={() => item.label === 'File PDF' ? onFilter('digital') : onCategory(item.label)}>
          <View style={[s.categoryIcon, { backgroundColor: item.tone }]}><Ionicons name={item.icon} size={19} color={palette.navy} /></View>
          <Text style={s.bold}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
    <View onLayout={event => onCatalogLayout(event.nativeEvent.layout.y)} style={s.between}>
      <Text accessibilityRole="header" style={s.section}>{keyword.trim() ? 'Kết quả tìm kiếm' : category || (filter ? listingLabels[filter] : showAll ? 'Tất cả tài liệu' : 'Tài liệu nổi bật')}</Text>
      {filtered ? <WebButton title="Xóa bộ lọc" onPress={onReset} /> : !showAll && <WebButton title="Xem tất cả" icon="arrow-forward" onPress={browse} />}
    </View>
    {status === 'loading' ? <ActivityIndicator accessibilityLabel="Đang tải tài liệu" color={palette.navy} /> :
      status === 'error' ? <View style={panel}><Text style={s.bold}>Chưa tải được danh sách tài liệu.</Text><WebButton title="Thử lại" onPress={onRetry} /></View> :
      featured.length ? <View style={s.grid}>{featured.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => onOpen(item)} style={s.listing}>
        <View style={[s.stage, { backgroundColor: types[item.type].stage }]}><WebCover item={item} /></View>
        <View style={s.cardCopy}><Text style={s.heading} numberOfLines={2}>{item.title}</Text><Text style={s.bold}>{item.owner?.name}</Text>
          {!!item.owner?.school && <Text style={s.muted}>{item.owner.school}</Text>}
          <Text style={[s.heading, item.type === 'digital' && s.free]}>{cost(item)}{item.type === 'points' ? ' · Nhận tại trường' : ''}</Text>
        </View>
      </Pressable>)}</View> : <View style={panel}><Text style={s.bold}>{filtered ? 'Chưa có tài liệu phù hợp.' : 'Chưa có tài liệu được duyệt.'}</Text></View>}
  </>;
}

export type LibraryData = { rows: Listing[]; saved: string[]; recent: string[]; acquired: string[] };
const tabs = [
  { id: '', label: 'Tất cả' }, { id: 'sale', label: 'Đã mua' }, { id: 'digital', label: 'Miễn phí' },
  { id: 'points', label: 'Đổi điểm' }, { id: 'saved', label: 'Tài liệu đã lưu' },
] as const;
export function StudentLibrary({ data, selected, choose, query, change, onOpen, onBrowse }: {
  data: LibraryData; selected: string; choose: (key: string) => void; query: string; change: (value: string) => void; onOpen: (row: Listing) => void; onBrowse: () => void;
}) {
  const visible = data.rows.filter(item => (
    (!selected || (selected === 'saved' ? data.saved.includes(item.id) : selected === item.type && (item.type === 'digital' || data.acquired.includes(item.id)))) &&
    [item.title, item.subject, item.owner?.name || ''].some(value => fold(value || '').includes(fold(query.trim())))
  ));
  const recent = data.recent.map(id => data.rows.find(row => row.id === id)).filter((row): row is Listing => !!row).slice(0, 2);
  return <View style={s.two}>
    <View style={[panel, s.libraryMenu]}>
      <Text accessibilityRole="header" style={s.heading}>Danh mục</Text>
      {tabs.map(tab => <Pressable key={tab.id} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: selected === tab.id }} onPress={() => choose(tab.id)}
        style={[s.menuRow, selected === tab.id && s.active]}><Text style={s.bold}>{tab.label}</Text></Pressable>)}
      <View style={s.libraryTip}><Text style={s.bold}>Tủ sách luôn bên bạn</Text><Text style={s.muted}>Tìm lại tài liệu yêu thích và tiếp tục học bất cứ lúc nào.</Text></View>
    </View>
    <View style={[column, s.flex]}>
      {!!recent.length && <>
        <Text accessibilityRole="header" style={s.section}>Mở lại gần đây</Text>
        <View style={s.two}>{recent.map((item, i) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Mở lại ' + item.title}
          onPress={() => onOpen(item)} style={[s.recent, { backgroundColor: i ? '#e6edff' : palette.pale }]}>
          <WebCover item={item} size="medium" /><View style={s.flex}><Text style={s.heading}>{item.title}</Text><Text style={s.muted}>{item.owner?.name}</Text>
            <Text style={s.bold}>{cost(item)}</Text><Text style={s.muted}>Mở tài liệu →</Text></View>
        </Pressable>)}</View>
      </>}
      <View style={s.between}><Text accessibilityRole="header" style={s.section}>{selected ? tabs.find(tab => tab.id === selected)?.label : 'Tất cả tài liệu'}</Text>
        <TextInput accessibilityLabel="Tìm trong thư viện" value={query} onChangeText={change} placeholder="Tìm trong thư viện…" placeholderTextColor={palette.muted} style={s.input} /></View>
      <View style={panel}>
        {!!visible.length && <View style={s.libraryRow}><Text style={[s.flex, s.muted]}>TÀI LIỆU</Text><Text style={s.muted}>HÌNH THỨC</Text><Text style={s.muted}>THAO TÁC</Text></View>}
        {visible.map(item => <View key={item.id} style={s.libraryRow}>
          <WebCover item={item} size="small" />
          <View style={s.flex}><Text style={s.bold}>{item.title}</Text><Text style={s.muted}>{item.owner?.name}</Text></View>
          <Text style={[s.pill, { backgroundColor: types[item.type].tone }]}>{cost(item)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={'Mở ' + item.title} onPress={() => onOpen(item)}><Text style={s.bold}>Mở tài liệu →</Text></Pressable>
        </View>)}
        {!visible.length && <><Text style={s.bold}>Chưa có tài liệu trong mục này.</Text><View style={s.start}><WebButton title="Khám phá tài liệu" onPress={onBrowse} /></View></>}
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  title: { color: palette.ink, fontWeight: '800', fontSize: 31, letterSpacing: -0.5 },
  section: { color: palette.ink, fontWeight: '800', fontSize: 22 },
  heading: { fontSize: 17, color: palette.ink, fontWeight: '800' },
  bold: { fontSize: 14, color: palette.ink, fontWeight: '700' },
  muted: { fontSize: 13, color: palette.muted },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  two: { flexDirection: 'row', gap: 23, alignItems: 'flex-start' },
  start: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  hero: { minHeight: 292, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: 30, borderRadius: 18, backgroundColor: palette.navy },
  heroText: { flex: 1, minWidth: 0, gap: 14 },
  heroKicker: { color: '#ffdd57', fontWeight: '800', fontSize: 12 },
  heroTitle: { color: '#fff', fontSize: 40, fontWeight: '800', lineHeight: 44, letterSpacing: -0.6 },
  heroDescription: { fontSize: 14, color: '#e0e8f1' },
  heroImage: { width: '29%', height: 228, borderRadius: 14, backgroundColor: '#e8e0fc' },
  shortcuts: { flex: 1, alignSelf: 'stretch', gap: 19 },
  iconTile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryRow: { flexDirection: 'row', gap: 15 },
  category: { flex: 1, minWidth: 0, backgroundColor: 'white', padding: 15, gap: 12, minHeight: 73, borderRadius: 13, flexDirection: 'row', alignItems: 'center' },
  categoryIcon: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: palette.pale },
  grid: { flexDirection: 'row', columnGap: '1.8%', rowGap: 20, flexWrap: 'wrap' },
  listing: { width: '32.13%', minWidth: 0, borderRadius: 14, overflow: 'hidden', backgroundColor: 'white' },
  stage: { height: 165, justifyContent: 'center', alignItems: 'center' },
  coverFrame: { overflow: 'hidden', borderRadius: 10, justifyContent: 'flex-start' },
  coverNormal: { width: 154, height: 132, gap: 7, padding: 10 },
  coverMedium: { width: 78, height: 99, gap: 5, padding: 7 },
  coverSmall: { width: 48, height: 59, gap: 3, padding: 4 },
  coverLarge: { width: '100%', aspectRatio: 1.12, gap: 7, padding: 13, maxWidth: 215 },
  coverTag: { fontWeight: '800', fontSize: 9 },
  coverTitle: { color: 'white', fontSize: 13, fontWeight: '800', width: '83%' },
  tiny: { fontSize: 8, width: '100%' },
  largeTitle: { fontSize: 17 },
  image: { position: 'absolute', width: '100%', height: '100%' },
  ring: { position: 'absolute', right: '-23%', top: '30%', width: '73%', aspectRatio: 1, borderRadius: 98, borderWidth: 1, opacity: 0.6 },
  innerRing: { position: 'absolute', right: '-10%', top: '40%', width: '52%', aspectRatio: 1, borderRadius: 90, borderWidth: 1, opacity: 0.55 },
  cardCopy: { gap: 6, padding: 18 },
  free: { color: '#16734c' },
  libraryMenu: { width: '18%', minWidth: 155, padding: 19 },
  menuRow: { padding: 12, borderRadius: 8 },
  libraryTip: { padding: 12, gap: 7, backgroundColor: palette.soft, borderRadius: 10 },
  recent: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 15, alignItems: 'center', borderRadius: 14, padding: 19 },
  input: { backgroundColor: '#fff', minHeight: 41, paddingHorizontal: 13, borderRadius: 8, fontSize: 13, color: palette.ink },
  libraryRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 46, paddingVertical: 5 },
  pill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, color: palette.ink, fontSize: 12 },
});
