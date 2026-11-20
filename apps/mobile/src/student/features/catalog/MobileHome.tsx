import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listingLabels, type Listing, type ListingType } from '../../../../../../packages/contracts';
import { Button, Cover, HomeTile } from '../../ui';
import { styles } from '../../styles';
import { price } from '../../models';

export function MobileHome({ q, setQ, filter, setFilter, toggleFilter, catalogState, matches, region, onNotifications, onChat, onRetry, onOpen, onRegion, onAssistant }: {
  q: string; setQ: (value: string) => void; filter: ListingType | ''; setFilter: (value: ListingType | '') => void; toggleFilter: (type: ListingType) => void;
  catalogState: 'loading' | 'ready' | 'error'; matches: Listing[]; region: string;
  onNotifications: () => void; onChat: () => void; onRetry: () => void; onOpen: (item: Listing) => void; onRegion: () => void; onAssistant: () => void;
}) {
  return <>
    <View style={styles.row}><View style={styles.brandIcon}><Ionicons name="book-outline" size={18} color="#171815" /></View><Text style={[styles.brandSmall, styles.flex]}>EduShare</Text><Pressable accessibilityRole="button" accessibilityLabel="Thông báo" hitSlop={10} onPress={onNotifications}><Ionicons name="notifications-outline" size={23} color="#203448" /></Pressable></View>
    <View style={styles.search}>
      <Ionicons name="search-outline" size={20} color="#203448" />
      <TextInput accessibilityLabel="Tìm tài liệu" placeholder="Tìm tài liệu, môn học hoặc trường…" placeholderTextColor="#586474" value={q} onChangeText={setQ} style={styles.searchInput} />
      {!!q && <Pressable accessibilityLabel="Xóa từ khóa" onPress={() => setQ('')}><Ionicons name="close-circle-outline" size={20} color="#586474" /></Pressable>}
    </View>
    <View style={styles.banner}>
      <View style={styles.flex}>
        <Text style={styles.bannerTitle}>Tủ tài liệu{'\n'}cho kỳ thi</Text>
        <Text style={styles.bannerText}>Học cùng cộng đồng sinh viên</Text>
        <Pressable accessibilityRole="button" onPress={() => { setQ(''); setFilter(''); }} style={styles.bannerAction}><Text style={styles.bold}>Khám phá ngay →</Text></Pressable>
      </View>
      <Ionicons name="book-outline" color="#ffcf1a" size={57} />
    </View>
    <View style={styles.tiles}>
      <HomeTile name="Mua bán" glyph="bag-handle-outline" color="#fff0ba" active={filter === 'sale'} press={() => toggleFilter('sale')} />
      <HomeTile name="Đổi điểm" glyph="swap-horizontal-outline" color="#dde9ff" active={filter === 'points'} press={() => toggleFilter('points')} />
      <HomeTile name="Chat" glyph="chatbubble-ellipses-outline" color="#eae4ff" press={onChat} />
      <HomeTile name="Miễn phí" glyph="download-outline" color="#ddf5e6" active={filter === 'digital'} press={() => toggleFilter('digital')} />
    </View>
    <Text style={styles.heading}>Danh mục nổi bật</Text>
    <View style={styles.tiles}>
      <HomeTile name="Sách" glyph="book-outline" color="#fcebc2" circle press={() => { setFilter(''); setQ('Sách'); }} />
      <HomeTile name="Giáo trình" glyph="document-text-outline" color="#dae9f1" circle press={() => { setFilter(''); setQ('Giáo trình'); }} />
      <HomeTile name="Slide" glyph="easel-outline" color="#e9e2fa" circle press={() => { setFilter(''); setQ('Slide'); }} />
      <HomeTile name="Đề thi" glyph="clipboard-outline" color="#fce3df" circle press={() => { setFilter(''); setQ('Đề thi'); }} />
      <HomeTile name="File PDF" glyph="document-outline" color="#dfefe6" circle press={() => toggleFilter('digital')} />
    </View>
    <View style={styles.sectionTitle}><Text style={styles.heading}>{filter ? listingLabels[filter] : 'Tài liệu nổi bật'}</Text>
      {(filter || q) && <Pressable accessibilityRole="button" onPress={() => { setFilter(''); setQ(''); }}><Text style={styles.small}>Xóa bộ lọc</Text></Pressable>}
    </View>
    {catalogState === 'loading' ? <ActivityIndicator accessibilityLabel="Đang tải tài liệu" color="#9d6a00" /> : catalogState === 'error' ?
      <View style={styles.panel}><Text style={styles.bold}>Chưa tải được danh sách</Text><Text style={styles.small}>Kiểm tra API và kết nối MongoDB.</Text><Button caption="Thử lại" onPress={onRetry} alt /></View> :
      matches.length ? <View style={styles.grid}>{matches.map(item => <Pressable key={item.id} style={styles.gridItem} onPress={() => onOpen(item)}>
        <Cover doc={item} wide /><Text style={styles.bold} numberOfLines={2}>{item.title}</Text><Text style={styles.small} numberOfLines={1}>{item.owner?.name}</Text><Text style={styles.small} numberOfLines={2}>{item.owner?.school}</Text><Text style={styles.price}>{price(item)}</Text>
      </Pressable>)}</View> :
      <View style={styles.panel}><Text style={styles.bold}>{filter || q ? 'Chưa có tài liệu phù hợp' : 'Chưa có tài liệu được duyệt'}</Text>
      <Text style={styles.small}>{filter || q ? 'Thử xóa bộ lọc hoặc chọn khu vực khác.' : 'Tài liệu sẽ xuất hiện sau khi quản trị viên duyệt.'}</Text></View>}
    <View style={styles.wrap}><Button caption={'Khu vực · ' + region} onPress={onRegion} alt /><Button caption="Trợ lý AI" onPress={onAssistant} alt /></View>
  </>;
}
