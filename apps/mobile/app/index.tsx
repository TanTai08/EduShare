import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { listingLabels, schools, type Listing, type ListingType, type PublicUser } from '../../../packages/contracts';
import { sample } from '../src/sample';

const endpoint = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
type User = PublicUser & { points: number; saved: string[] };
type Deal = { _id: string; buyer: string; seller: string; type: string; price: number; time: string; location: string; status: string; confirmations: string[]; counterparty?: PublicUser; document?: { title: string; cover?: string } };
type AiTurn = { question: string; answer: string; sources: { id: string; title: string }[] };
type Message = { _id: string; from: string; text: string };
type Point = { _id: string; amount: number; reason: string };
type Review = { _id: string; rating: number; text: string };
type Page = 'welcome' | 'login' | 'register' | 'home' | 'detail' | 'publish' | 'preview' | 'posted' | 'account' | 'saved' | 'mine' | 'wallet' | 'deals' | 'appointment' | 'inbox' | 'chat' | 'profile' | 'assistant' | 'report' | 'moderation' | 'edit' | 'review' | 'region' | 'notifications' | 'dealProgress' | 'pdfOpened' | 'reportSent';
const status: Record<string, string> = { requested: 'Chờ người đăng xác nhận', scheduled: 'Đã hẹn', waiting: 'Chờ bên còn lại xác nhận', completed: 'Hoàn tất', cancelled: 'Đã hủy', pending: 'Chờ duyệt', approved: 'Đã duyệt', revision: 'Cần sửa' };
const money = (n: number) => n.toLocaleString('vi-VN') + ' ₫';
const price = (doc: Listing) => doc.type === 'digital' ? 'Miễn phí' : doc.type === 'sale' ? money(doc.price) : doc.price + ' điểm';
const blank = { title: '', subject: '', category: '', description: '', cost: '', fileUrl: '', cover: '', pdf: '', fileName: '' };

function Button({ caption, onPress, alt = false, fill = false }: { caption: string; onPress: () => void; alt?: boolean; fill?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, alt && styles.alt, fill && styles.flex]}><Text style={styles.bold}>{caption}</Text></Pressable>;
}
function Field({ label, value, change, secret = false }: { label: string; value: string; change: (s: string) => void; secret?: boolean }) {
  return <View style={styles.field}><Text style={styles.small}>{label}</Text><TextInput accessibilityLabel={label} placeholder={label} autoCapitalize="none" secureTextEntry={secret} value={value} onChangeText={change} style={styles.input} /></View>;
}
function Avatar({ user, large = false }: { user: PublicUser; large?: boolean }) {
  return user.avatar ? <Image source={{ uri: user.avatar }} style={[styles.avatar, large && styles.largeAvatar]} /> : <View style={[styles.avatar, large && styles.largeAvatar]}><Text style={styles.bold}>{user.name.slice(0, 1)}</Text></View>;
}
function Cover({ doc, wide = false, hero = false }: { doc: Listing; wide?: boolean; hero?: boolean }) {
  return doc.cover ? <Image source={{ uri: doc.cover }} style={[styles.cover, wide && styles.wideCover, hero && styles.detailCover]} /> : <View style={[styles.cover, wide && styles.wideCover, hero && styles.detailCover, { backgroundColor: doc.type === 'sale' ? '#234569' : doc.type === 'points' ? '#355D53' : '#554579' }]}><Ionicons name="book-outline" color="#ffdc55" size={24} /><Text style={styles.coverTitle} numberOfLines={3}>{doc.title}</Text></View>;
}
export default function EduShare() {
  const [page, go] = useState<Page>('welcome');
  const history = useRef<Page[]>([]);
  const afterLogin = useRef<Page>('home');
  const [token, setToken] = useState('');
  const [me, setMe] = useState<User | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Listing[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [list, setList] = useState<Listing[]>([]);
  const [doc, setDoc] = useState<Listing>(sample[0]);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('Đà Nẵng');
  const [filter, setFilter] = useState<ListingType | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [schoolId, setSchool] = useState<string>(schools[0].id);
  const [type, setType] = useState<ListingType>('digital');
  const [form, setForm] = useState(blank);
  const [aiFields, setAiFields] = useState<string[]>([]);
  const [editing, setEditing] = useState('');
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');
  const [peer, setPeer] = useState<PublicUser>(sample[0].owner);
  const [contacts, setContacts] = useState<PublicUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatDocument, setChatDocument] = useState<Listing | null>(null);
  const [reviewItems, setReviews] = useState<Review[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState('');
  const [points, setPoints] = useState<{ balance: number; entries: Point[] }>({ balance: 0, entries: [] });
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewDeal, setReviewDeal] = useState('');
  const [profileName, setProfileName] = useState('');
  const [avatar, setAvatar] = useState('');

  async function api<T>(path: string, method = 'GET', data?: unknown, session = token): Promise<T> {
    const response = await fetch(endpoint + path, {
      method, headers: { ...(session ? { Authorization: 'Bearer ' + session } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (response.status === 204) return undefined as T;
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Không thể kết nối máy chủ.');
    return body as T;
  }
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setNotice('');
    try { await task(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Có lỗi xảy ra.'); }
    finally { setBusy(false); }
  }
  function open(next: Page) {
    if (next === page) return;
    if (next === 'home' || next === 'welcome') history.current = [];
    else history.current.push(page);
    setNotice(''); setMessage(''); go(next);
  }
  function back() {
    const previous = history.current.pop();
    if (!previous) return false;
    setNotice(''); setMessage(''); go(previous);
    return true;
  }
  function secured(next: Page) {
    if (!me) { afterLogin.current = next; open('login'); return; }
    open(next);
  }
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    return () => subscription.remove();
  }, [page]);
  useEffect(() => {
    void AsyncStorage.getItem('edushare-session').then(async session => {
      if (!session) return;
      try {
        const user = await api<User>('/me', 'GET', undefined, session);
        setMe(user); setToken(session); setRegion(user.region); go('home');
      } catch { /* Keep the welcome screen available offline. */ }
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (page !== 'home') return;
    let alive = true;
    setCatalogState('loading');
    void api<Listing[]>('/documents?region=' + encodeURIComponent(region) + (filter ? '&type=' + filter : '')).then(rows => {
      if (alive) { setItems(rows); setCatalogState('ready'); }
    }).catch(() => { if (alive) { setItems([]); setCatalogState('error'); } });
    return () => { alive = false; };
  }, [page, region, filter, catalogRefresh]);
  useEffect(() => {
    if (!token || page !== 'chat') return;
    let alive = true;
    const refresh = () => void api<Message[]>('/chat/' + peer.id).then(rows => { if (alive) setMessages(rows); }).catch(() => {});
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => { alive = false; clearInterval(interval); };
  }, [token, page, peer.id]);
  const authenticate = () => run(async () => {
    if (page === 'register' && password !== confirmation) throw new Error('Mật khẩu xác nhận chưa khớp.');
    const response = await api<{ token: string; user: User }>(page === 'register' ? '/auth/register' : '/auth/login', 'POST',
      page === 'register' ? { name, email, password, schoolId } : { email, password });
    await AsyncStorage.setItem('edushare-session', response.token);
    setMe(response.user); setToken(response.token); setRegion(response.user.region); setPassword(''); setConfirmation('');
    const destination = afterLogin.current;
    afterLogin.current = 'home'; history.current = destination === 'home' ? [] : ['home'];
    setNotice(''); go(destination);
  });
  async function pick(): Promise<string | undefined> {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.45 });
    const value = result.assets?.[0];
    if (result.canceled || !value?.base64) return;
    const encoded = 'data:image/jpeg;base64,' + value.base64;
    if (encoded.length > 4_000_000) throw new Error('Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn.');
    return encoded;
  }
  function loadList(path: string, next: Page) { void run(async () => { setList(await api<Listing[]>(path)); open(next); }); }
  function showDeals(destination: 'deals' | 'notifications' = 'deals') {
    if (!me) { secured(destination); return; }
    void run(async () => { setDeals(await api<Deal[]>('/deals')); open(destination); });
  }
  useEffect(() => {
    if (!token || (page !== 'deals' && page !== 'notifications' && page !== 'dealProgress')) return;
    let alive = true;
    const refresh = () => void api<Deal[]>('/deals').then(rows => { if (alive) setDeals(rows); }).catch(() => {});
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => { alive = false; clearInterval(timer); };
  }, [token, page]);
  function showPeer(user: PublicUser) {
    setPeer(user); setReviews([]); open('profile');
    if (!user.id.startsWith('sample')) void run(async () => setReviews((await api<{ reviews: Review[] }>('/users/' + user.id)).reviews));
  }
  function startChat(user: PublicUser, listing: Listing | null = null) {
    if (!me) { open('login'); return; }
    if (user.id.startsWith('sample')) { setNotice('Hãy chọn tài liệu đã lưu trên máy chủ để nhắn tin.'); return; }
    setPeer(user); setChatDocument(listing); setMessages([]); open('chat');
  }
  function chooseType(value: ListingType) { setType(value); }
  function formField(key: keyof typeof blank) { return (value: string) => { setForm(current => ({ ...current, [key]: value })); setAiFields(fields => key === 'cover' ? [] : fields.filter(field => field !== key)); }; }
  const submit = () => run(async () => {
    await api(editing ? '/documents/' + editing : '/documents', editing ? 'PATCH' : 'POST', {
      title: form.title, subject: form.subject, category: form.category, description: form.description,
      type, price: type === 'digital' ? 0 : Number(form.cost), cover: form.cover || undefined,
      fileUrl: type === 'digital' ? form.fileUrl || undefined : undefined,
      pdf: type === 'digital' ? form.pdf || undefined : undefined,
      fileName: type === 'digital' ? form.fileName || undefined : undefined,
    });
    setForm(blank); setAiFields([]); setEditing(''); open('posted');
  });
  function card(value: Listing, press?: () => void) {
    return <Pressable key={value.id} style={styles.card} onPress={press || (() => { setDoc(value); open('detail'); })}>
      <Cover doc={value} /><View style={styles.flex}><Text style={styles.bold}>{value.title}</Text><Text style={styles.small}>{value.owner.name}</Text><Text style={styles.small}>{value.owner.school}</Text><Text style={styles.price}>{price(value)}</Text></View>
    </Pressable>;
  }
  function toggleFilter(value: ListingType) { setQ(''); setFilter(current => current === value ? '' : value); }
  const matches = items.filter(item => [item.title, item.subject, item.category, item.owner?.school || ''].some(v => v.toLowerCase().includes(q.toLowerCase())));
  if (page === 'welcome' || page === 'login' || page === 'register') {
    const welcome = page === 'welcome';
    const register = page === 'register';
    const title = register ? 'Đăng ký' : 'Đăng nhập';
    return <SafeAreaView style={[authStyles.shell, !welcome && authStyles.yellow]} edges={['top']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={authStyles.scroll}>
        {welcome ? <>
          <View style={authStyles.intro}>
            <View style={authStyles.illustration}><Ionicons name="library" size={74} color="#26396e" /><Ionicons name="school" size={39} color="#26396e" /></View>
            <Text style={authStyles.brand}>EduShare</Text><Text style={authStyles.muted}>Tài liệu học tập cho sinh viên</Text>
          </View>
          <View style={authStyles.welcomePanel}>
            <Text style={authStyles.title}>Chào mừng!</Text>
            <Text style={authStyles.description}>Mua, trao đổi và tải tài liệu học tập cùng cộng đồng sinh viên.</Text>
            <View style={authStyles.actions}>
              <AuthButton caption="Đăng nhập" press={() => open('login')} />
              <AuthButton caption="Đăng ký" light press={() => open('register')} />
            </View>
            <Pressable accessibilityRole="button" onPress={() => open('home')}><Text style={authStyles.guest}>Khám phá tài liệu</Text></Pressable>
          </View>
        </> : <>
          <View style={authStyles.header}>
            <View style={authStyles.headerRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={12} onPress={() => open('welcome')}><Ionicons name="arrow-back" size={22} color="#151512" /></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setSchoolsOpen(false); open(register ? 'login' : 'register'); }}><Text style={authStyles.link}>{register ? 'Đăng nhập' : 'Đăng ký'}</Text></Pressable>
            </View>
            <Text style={authStyles.title}>{title}</Text>
            <Text style={authStyles.description}>{register ? 'Tạo tài khoản để chia sẻ tài liệu học tập.' : 'Chào mừng bạn trở lại EduShare.'}</Text>
          </View>
          <View style={authStyles.form}>
            {register && <AuthInput label="Họ và tên" value={name} change={setName} />}
            <AuthInput label="Email sinh viên" value={email} change={setEmail} email />
            <AuthInput label="Mật khẩu" value={password} change={setPassword} secret />
            {register && <>
              <AuthInput label="Xác nhận mật khẩu" value={confirmation} change={setConfirmation} secret />
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: schoolsOpen }} style={authStyles.school} onPress={() => setSchoolsOpen(value => !value)}>
                <Text style={authStyles.schoolText}>{schools.find(s => s.id === schoolId)?.name}</Text><Ionicons name={schoolsOpen ? 'chevron-up' : 'chevron-down'} size={16} />
              </Pressable>
              {schoolsOpen && schools.map(s => <Pressable key={s.id} accessibilityRole="button" accessibilityState={{ selected: s.id === schoolId }} style={authStyles.school} onPress={() => { setSchool(s.id); setSchoolsOpen(false); }}>
                <Text style={authStyles.schoolText}>{s.name}</Text>{s.id === schoolId && <Ionicons name="checkmark" size={18} />}
              </Pressable>)}
            </>}
            {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
            <View style={authStyles.submit}><AuthButton caption={busy ? 'Đang xử lý…' : title} press={authenticate} disabled={busy} /></View>
          </View>
        </>}
      </ScrollView>
    </SafeAreaView>;
  }
  const heading: Partial<Record<Page, string>> = { login: 'Đăng nhập', register: 'Đăng ký', detail: 'Chi tiết tài liệu', publish: 'Đăng tài liệu', preview: 'Xem trước bài đăng', posted: 'Đã gửi duyệt', account: 'Hồ sơ của tôi', saved: 'Tài liệu đã lưu', mine: 'Bài đăng của tôi', deals: 'Lịch sử giao dịch', appointment: 'Đặt lịch nhận', wallet: 'Ví điểm', inbox: 'Tin nhắn', chat: peer.name, profile: 'Hồ sơ công khai', assistant: 'Trợ lý AI', report: 'Báo cáo tài liệu', moderation: 'Duyệt bài đăng', edit: 'Chỉnh sửa hồ sơ', review: 'Đánh giá giao dịch', region: 'Khu vực giao dịch', notifications: 'Thông báo', dealProgress: 'Tiến trình giao dịch', pdfOpened: 'Tài liệu PDF', reportSent: 'Đã gửi báo cáo' };
  return <SafeAreaView style={styles.shell}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {heading[page] && <Pressable accessibilityRole="button" onPress={() => { if (!back()) open('home'); }} style={styles.row}><Ionicons name="arrow-back" size={22} /><Text style={styles.heading}>{heading[page]}</Text></Pressable>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
      {busy && <Text style={styles.small}>Đang xử lý…</Text>}
      {page === 'home' && <>
        <View style={styles.row}><View style={styles.brandIcon}><Ionicons name="book-outline" size={18} color="#171815" /></View><Text style={[styles.brandSmall, styles.flex]}>EduShare</Text><Pressable accessibilityRole="button" accessibilityLabel="Thông báo" hitSlop={10} onPress={() => showDeals('notifications')}><Ionicons name="notifications-outline" size={23} color="#203448" /></Pressable></View>
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
          <HomeTile name="Chat" glyph="chatbubble-ellipses-outline" color="#eae4ff" press={() => me ? void run(async () => { setContacts(await api<PublicUser[]>('/chat')); open('inbox'); }) : open('login')} />
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
          <View style={styles.panel}><Text style={styles.bold}>Chưa tải được danh sách</Text><Text style={styles.small}>Kiểm tra API và kết nối MongoDB.</Text><Button caption="Thử lại" onPress={() => setCatalogRefresh(n => n + 1)} alt /></View> :
          matches.length ? <View style={styles.grid}>{matches.map(item => <Pressable key={item.id} style={styles.gridItem} onPress={() => { setDoc(item); open('detail'); }}>
            <Cover doc={item} wide /><Text style={styles.bold} numberOfLines={2}>{item.title}</Text><Text style={styles.small} numberOfLines={1}>{item.owner?.name}</Text><Text style={styles.small} numberOfLines={2}>{item.owner?.school}</Text><Text style={styles.price}>{price(item)}</Text>
          </Pressable>)}</View> :
          <View style={styles.panel}><Text style={styles.bold}>{filter || q ? 'Chưa có tài liệu phù hợp' : 'Chưa có tài liệu được duyệt'}</Text>
          <Text style={styles.small}>{filter || q ? 'Thử xóa bộ lọc hoặc chọn khu vực khác.' : 'Tài liệu sẽ xuất hiện sau khi quản trị viên duyệt.'}</Text></View>}
        <View style={styles.wrap}><Button caption={'Khu vực · ' + region} onPress={() => open('region')} alt /><Button caption="Trợ lý AI" onPress={() => secured('assistant')} alt /></View>
      </>}
      {page === 'region' && <>
        <View style={styles.panel}><Text style={styles.bold}>Khu vực hồ sơ</Text><Text>{me?.region || 'Chọn trường khi đăng ký.'}</Text><Text style={styles.small}>Mua bán và nhận bằng điểm áp dụng trong cùng khu vực. PDF miễn phí có thể tải ở mọi nơi.</Text></View>
        {['Đà Nẵng', 'Huế'].map(value => <Button key={value} caption={value} onPress={() => { setRegion(value); open('home'); }} alt={value !== region} />)}
      </>}
      {page === 'notifications' && (deals.length ? deals.map(deal => <Pressable accessibilityRole="button" key={deal._id} style={styles.panel} onPress={() => { setSelectedDeal(deal._id); open('dealProgress'); }}>
        <Text style={styles.bold}>{status[deal.status]}</Text><Text>{deal.document?.title || 'Tài liệu'}</Text><Text style={styles.small}>{deal.counterparty?.name} · {deal.time}</Text>
      </Pressable>) : <Text>Chưa có cập nhật giao dịch.</Text>)}
      {page === 'detail' && <>
        <Cover doc={doc} hero />
        <Text style={styles.detailTitle}>{doc.title}</Text>
        <Text style={styles.small}>{doc.type === 'digital' ? 'Tài liệu số · PDF online' : 'Bản in · Nhận tại ' + doc.owner.region}</Text>
        <View style={styles.detailPanel}><Text style={styles.bold}>{price(doc)}</Text><Text style={styles.small}>{doc.type === 'sale' ? 'Trả trực tiếp khi nhận' : doc.type === 'points' ? 'Giữ điểm khi đặt hẹn' : 'Xem và tải miễn phí'}</Text></View>
        <Pressable accessibilityRole="button" style={styles.card} onPress={() => showPeer(doc.owner)}>
          <Avatar user={doc.owner} /><View style={styles.flex}><Text style={styles.bold}>{doc.owner.name}</Text><Text style={styles.small}>{doc.owner.school}</Text></View><Ionicons name="chevron-forward" size={18} />
        </Pressable>
        <View style={styles.detailPanel}><Text style={styles.bold}>Nội dung tài liệu</Text><Text style={styles.body}>{doc.description}</Text></View>
        {doc.type === 'digital' ? <Button caption="Mở PDF miễn phí" onPress={() => void run(async () => { const target = doc.fileUrl || (doc.fileName ? endpoint + '/documents/' + doc.id + '/pdf' : ''); if (!target) throw new Error('Thêm tài liệu đã duyệt để mở PDF.'); await Linking.openURL(target); open('pdfOpened'); })} /> :
          <View style={styles.splitActions}><Button caption="Nhắn tin" alt fill onPress={() => startChat(doc.owner, doc)} /><Button fill caption={doc.type === 'sale' ? 'Đặt lịch · ' + price(doc) : 'Giữ chỗ · ' + price(doc)} onPress={() => { if (me && doc.owner.id === me.id) { setNotice('Đây là tài liệu của bạn.'); return; }
          if (me && doc.owner.region !== me.region) { setNotice('Tài liệu này giao nhận tại ' + doc.owner.region + '. Hãy chọn tài liệu cùng khu vực với trường của bạn.'); return; }
          setPlace(''); setTime(''); secured('appointment'); }} /></View>}
        <Button caption={me?.saved.includes(doc.id) ? 'Bỏ lưu tài liệu' : 'Lưu tài liệu'} alt onPress={() => { if (!me) { open('login'); return; } void run(async () => {
          const { saved } = await api<{ saved: boolean }>('/documents/' + doc.id + '/save', 'POST', { saved: !me.saved.includes(doc.id) });
          setMe({ ...me, saved: saved ? [...me.saved, doc.id] : me.saved.filter(id => id !== doc.id) });
        }); }} />
        <Button caption="Báo cáo tài liệu" alt onPress={() => { setReason(''); setEvidence(''); secured('report'); }} />
      </>}
      {page === 'pdfOpened' && <>
        <View style={styles.hero}><Ionicons name="document-text-outline" size={44} color="#203448" /><Text style={styles.heading}>{doc.title}</Text><Text style={styles.small}>Tệp được mở bằng trình xem PDF của thiết bị.</Text></View>
        <Button caption="Về chi tiết tài liệu" onPress={() => { if (!back()) open('detail'); }} />
        <Button caption="Tiếp tục khám phá" onPress={() => open('home')} alt />
      </>}
      {page === 'appointment' && <>
        {card(doc)}<Text style={styles.small}>{doc.type === 'sale' ? 'Trả ' + price(doc) + ' trực tiếp khi nhận tài liệu.' : 'Giữ ' + price(doc) + ' khi gửi yêu cầu. Hoàn điểm nếu hủy trước khi giao.'}</Text><Field label="Điểm hẹn" value={place} change={setPlace} /><Field label="Ngày và giờ hẹn" value={time} change={setTime} />
        <Button caption="Gửi yêu cầu đặt hẹn" onPress={() => void run(async () => { const created = await api<Deal>('/deals', 'POST', { doc: doc.id, location: place, time }); setSelectedDeal(created._id); setDeals(current => [{ ...created, document: { title: doc.title, cover: doc.cover }, counterparty: doc.owner }, ...current]); open('dealProgress'); })} />
      </>}
      {page === 'deals' && (deals.length ? deals.map(deal => <Pressable accessibilityRole="button" key={deal._id} style={styles.panel} onPress={() => { setSelectedDeal(deal._id); open('dealProgress'); }}>
        <Text style={styles.bold}>{deal.document?.title || 'Tài liệu'}</Text><Text style={styles.price}>{status[deal.status]}</Text><Text style={styles.small}>{deal.counterparty?.name} · {deal.location}</Text>
      </Pressable>) : <Text>Chưa có giao dịch.</Text>)}
      {page === 'dealProgress' && deals.filter(deal => deal._id === selectedDeal).map(deal => <View key={deal._id} style={styles.dealLayout}>
        <View style={styles.row}>{deal.document?.cover && <Image source={{ uri: deal.document.cover }} style={styles.dealCover} />}<View style={styles.flex}><Text style={styles.bold}>{deal.document?.title || 'Tài liệu'}</Text><Text style={styles.price}>{status[deal.status]}</Text><Text style={styles.small}>{deal.location} · {deal.time}</Text></View></View>
        <Text style={styles.small}>{deal.type === 'sale' ? money(deal.price) + ' · Trả trực tiếp khi nhận' : deal.price + ' điểm · ' + (deal.status === 'cancelled' ? 'Đã hoàn điểm' : deal.status === 'completed' ? 'Đã sử dụng' : 'Đang giữ')}</Text>
        {deal.counterparty && <Pressable accessibilityRole="button" style={styles.row} onPress={() => showPeer(deal.counterparty!)}><Avatar user={deal.counterparty} /><View><Text style={styles.bold}>{deal.counterparty.name}</Text><Text style={styles.small}>{deal.counterparty.school}</Text></View></Pressable>}
        {deal.counterparty && ['requested', 'scheduled', 'waiting'].includes(deal.status) && <Button caption="Nhắn tin" alt onPress={() => startChat(deal.counterparty!)} />}
        {deal.status !== 'cancelled' && ['Đề nghị đặt hẹn', 'Chốt lịch và giao nhận', 'Hai bên xác nhận'].map((label, i) => {
          const step = deal.status === 'requested' ? 0 : deal.status === 'scheduled' ? 1 : 2;
          const description = [deal.location + ' · ' + deal.time, deal.type === 'sale' ? 'Trả trực tiếp khi nhận tài liệu.' : 'Giao nhận tại điểm hẹn.', 'Hai bên xác nhận để hoàn tất.'][i];
          return <View key={label} style={[styles.stage, i === 1 && styles.stageBlue]}><Text style={i <= step ? styles.bold : styles.small}>{i + 1}  {label}</Text><Text style={styles.small}>{description}</Text></View>;
        })}
        {deal.status === 'waiting' && me && deal.confirmations.includes(me.id) && <Text style={styles.small}>Bạn đã xác nhận. Giao dịch hoàn tất khi bên còn lại xác nhận.</Text>}
        {deal.status === 'requested' && deal.seller === me?.id && <Button caption="Chấp nhận lịch" onPress={() => void act(deal._id, 'accept')} />}
        {['requested', 'scheduled'].includes(deal.status) && <Button caption={deal.type === 'points' ? 'Hủy và hoàn điểm' : 'Hủy lịch'} onPress={() => void act(deal._id, 'cancel')} alt />}
        {['scheduled', 'waiting'].includes(deal.status) && !!me && !deal.confirmations.includes(me.id) && <Button caption={deal.buyer === me.id ? 'Đã nhận tài liệu' : deal.type === 'sale' ? 'Đã giao và nhận tiền' : 'Đã giao tài liệu'} onPress={() => void act(deal._id, 'confirm')} />}
        {deal.status === 'completed' && <Button caption="Đánh giá" onPress={() => { setReviewDeal(deal._id); setRating(5); open('review'); }} alt />}
      </View>)}
      {page === 'review' && <><View style={styles.wrap}>{[1, 2, 3, 4, 5].map(n => <Button key={n} caption={n + ' ★'} alt={rating !== n} onPress={() => setRating(n)} />)}</View><Field label="Nhận xét" value={message} change={setMessage} /><Button caption="Gửi đánh giá" onPress={() => void run(async () => { await api('/reviews', 'POST', { deal: reviewDeal, rating, text: message }); if (!back()) open('dealProgress'); setNotice('Đã gửi đánh giá.'); })} /></>}
      {page === 'publish' && <>
        {form.cover && <View style={styles.aiBanner}><Image source={{ uri: form.cover }} style={styles.aiCover} /><View style={styles.flex}><Text style={styles.bold}>{aiFields.length ? 'Đã đọc xong ảnh bìa' : 'Ảnh bìa tài liệu'}</Text><Text style={styles.small}>{aiFields.length ? 'Bạn có thể sửa các ô đã được AI điền.' : 'Dùng AI để gợi ý thông tin.'}</Text></View></View>}
        <Button caption="Chọn ảnh bìa" alt onPress={() => void run(async () => { const value = await pick(); if (value) formField('cover')(value); })} />
        {!!form.cover && <Button caption="Đọc ảnh bằng AI" onPress={() => void run(async () => {
          const result = await api<Partial<typeof blank>>('/ai/cover', 'POST', { cover: form.cover });
          setAiFields(Object.entries(result).filter(([, value]) => Boolean(value)).map(([key]) => key));
          setForm(old => ({ ...old, title: result.title || old.title, subject: result.subject || old.subject, category: result.category || old.category, description: result.description || old.description }));
        })} alt />}
        {([['title','Tên tài liệu'],['subject','Môn học'],['category','Danh mục'],['description','Mô tả']] as const).map(([key, label]) => <Field key={key} label={aiFields.includes(key) ? label + ' · AI' : label} value={form[key]} change={formField(key)} />)}
        <View style={styles.wrap}>{(Object.keys(listingLabels) as ListingType[]).map(value => <Button key={value} caption={listingLabels[value]} onPress={() => chooseType(value)} alt={value !== type} />)}</View>
        {type === 'digital' ? <>
          <Button caption={form.fileName || 'Chọn tệp PDF (tối đa 3 MB)'} alt onPress={() => void run(async () => {
            const selected = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: false, copyToCacheDirectory: true });
            if (selected.canceled) return;
            const picked = selected.assets[0];
            if ((picked.size ?? 0) > 3_000_000) throw new Error('Tệp PDF vượt quá 3 MB.');
            const pdf = Platform.OS === 'web' ? (picked.uri.split(',')[1] || '') : await new File(picked.uri).base64();
            if (!pdf || pdf.length > 4_000_000) throw new Error('Không đọc được PDF hoặc tệp quá lớn.');
            setForm(current => ({ ...current, pdf, fileName: picked.name, fileUrl: '' }));
          })} />
          <Field label="Hoặc liên kết HTTPS đến PDF" value={form.fileUrl} change={value => setForm(current => ({ ...current, fileUrl: value, pdf: '', fileName: '' }))} />
        </> : <Field label={type === 'sale' ? 'Giá bán (VNĐ)' : 'Điểm cần dùng'} value={form.cost} change={formField('cost')} />}
        <Button caption="Xem trước" onPress={() => open('preview')} />
      </>}
      {page === 'preview' && <>{form.cover && <Image source={{ uri: form.cover }} style={styles.picture} />}<Text style={styles.heading}>{form.title}</Text><Text>{form.subject} · {form.category}</Text><Text>{form.description}</Text><Text style={styles.price}>{type === 'sale' ? money(Number(form.cost)) + ' · Trả trực tiếp' : type === 'points' ? form.cost + ' điểm' : 'Miễn phí'}</Text><Button caption="Gửi bài để duyệt" onPress={() => void submit()} /><Button caption="Chỉnh sửa" alt onPress={() => open('publish')} /></>}
      {page === 'posted' && <View style={styles.hero}><Ionicons name="checkmark-circle" size={50} color="#287248" /><Text style={styles.heading}>Tài liệu đang chờ duyệt</Text><Button caption="Bài đăng của tôi" onPress={() => loadList('/documents/mine', 'mine')} /></View>}
      {page === 'account' && me && <>
        <View style={styles.accountHero}>
          <Pressable accessibilityRole="button" accessibilityLabel="Đổi ảnh đại diện" onPress={() => { setProfileName(me.name); setAvatar(me.avatar || ''); open('edit'); }}>
            <Avatar user={me} large />
            <View style={styles.avatarCamera}><Ionicons name="camera-outline" size={16} color="#171815" /></View>
          </Pressable>
          <Text style={styles.detailTitle}>{me.name}</Text><Text style={styles.small}>{me.school}</Text>
        </View>
        <AccountRow glyph="person-outline" caption="Chỉnh sửa hồ sơ" press={() => { setProfileName(me.name); setAvatar(me.avatar || ''); open('edit'); }} />
        <AccountRow glyph="bookmark-outline" caption="Tài liệu đã lưu" press={() => loadList('/documents/saved', 'saved')} />
        <AccountRow glyph="book-outline" caption="Bài đăng của tôi" press={() => loadList('/documents/mine', 'mine')} />
        <AccountRow glyph="swap-horizontal-outline" caption="Lịch sử giao dịch" press={() => showDeals()} />
        <AccountRow glyph="star-outline" caption="Ví điểm" press={() => void run(async () => { setPoints(await api<typeof points>('/points')); open('wallet'); })} />
        <Button caption="Duyệt bài (quản trị)" alt onPress={() => loadList('/moderation', 'moderation')} />
        <Button caption="Đăng xuất" onPress={() => void run(async () => { await api('/auth/logout', 'POST'); await AsyncStorage.removeItem('edushare-session'); setMe(null); setToken(''); setTurns([]); setDeals([]); afterLogin.current = 'home'; open('welcome'); })} />
      </>}
      {page === 'edit' && me && <><Avatar user={{ ...me, avatar }} /><Button caption="Thay ảnh đại diện" alt onPress={() => void run(async () => { const value = await pick(); if (value) setAvatar(value); })} /><Field label="Họ và tên" value={profileName} change={setProfileName} /><Button caption="Lưu thay đổi" onPress={() => void run(async () => { setMe(await api<User>('/me', 'PATCH', { name: profileName, avatar: avatar || undefined })); open('account'); })} /></>}
      {page === 'saved' && (list.length ? list.map(item => card(item)) : <Text>Chưa có tài liệu đã lưu.</Text>)}
      {(page === 'mine' || page === 'moderation') && (list.length ? list.map(item => <View key={item.id} style={styles.panel}>
        {card(item)}<Text>{status[item.status]}</Text>
        {page === 'mine' && item.status === 'revision' && <Button caption="Sửa và gửi lại" onPress={() => { setEditing(item.id); setAiFields([]); setType(item.type); setForm({ title: item.title, subject: item.subject, category: item.category, description: item.description, cover: item.cover || '', cost: String(item.price), fileUrl: item.fileUrl || '', fileName: item.fileName || '', pdf: '' }); open('publish'); }} />}
        {page === 'moderation' && <View style={styles.wrap}>{[true, false].map(approved => <Button key={String(approved)} caption={approved ? 'Duyệt bài' : 'Yêu cầu sửa'} alt={!approved} onPress={() => void run(async () => { await api('/moderation/' + item.id, 'POST', { approved }); setList(await api<Listing[]>('/moderation')); })} />)}</View>}
      </View>) : <Text>Chưa có bài đăng.</Text>)}
      {page === 'wallet' && <><View style={styles.hero}><Text style={styles.heading}>{points.balance} điểm khả dụng</Text></View>{points.entries.map(p => <View key={p._id} style={styles.panel}><Text style={styles.bold}>{p.amount > 0 ? '+' : ''}{p.amount} điểm</Text><Text>{p.reason}</Text></View>)}</>}
      {page === 'profile' && <><View style={styles.hero}><Avatar user={peer} /><Text style={styles.heading}>{peer.name}</Text><Text>{peer.school}</Text><Text>{reviewItems.length ? (reviewItems.reduce((sum, r) => sum + r.rating, 0) / reviewItems.length).toFixed(1) + ' ★' : 'Chưa có đánh giá'}</Text></View><Button caption="Nhắn tin" onPress={() => startChat(peer)} />{reviewItems.map(r => <View key={r._id} style={styles.panel}><Text style={styles.bold}>{r.rating} ★</Text><Text>{r.text}</Text></View>)}</>}
      {page === 'inbox' && (contacts.length ? contacts.map(user => <Pressable key={user.id} style={styles.card} onPress={() => startChat(user)}><Avatar user={user} /><Text style={styles.bold}>{user.name}</Text></Pressable>) : <Text>Bắt đầu trò chuyện từ trang chi tiết tài liệu.</Text>)}
      {page === 'chat' && <>
        <Pressable style={styles.card} onPress={() => showPeer(peer)}><Avatar user={peer} /><View><Text style={styles.bold}>{peer.name}</Text><Text style={styles.small}>{peer.school}</Text></View></Pressable>
        {chatDocument && <Pressable accessibilityRole="button" style={styles.aiBanner} onPress={() => { setDoc(chatDocument); open('detail'); }}>
          <Cover doc={chatDocument} /><View style={styles.flex}><Text style={styles.bold}>{chatDocument.title}</Text><Text style={styles.small}>{price(chatDocument)} · {chatDocument.type === 'sale' ? 'Trả trực tiếp khi nhận' : chatDocument.type === 'points' ? 'Nhận trực tiếp' : 'PDF online'}</Text></View>
        </Pressable>}
        {messages.map(item => <View key={item._id} style={[styles.bubble, item.from === me?.id && styles.mine]}><Avatar user={me && item.from === me.id ? me : peer} /><Text style={styles.flex}>{item.text}</Text></View>)}
        <View style={styles.composer}><TextInput accessibilityLabel="Nhập tin nhắn" placeholder="Nhập tin nhắn…" style={styles.searchInput} value={message} onChangeText={setMessage} /><Pressable accessibilityRole="button" accessibilityLabel="Gửi tin nhắn" disabled={busy || !message.trim()} style={styles.send} onPress={() => void run(async () => { const sent = await api<Message>('/chat/' + peer.id, 'POST', { text: message }); setMessage(''); setMessages(rows => rows.some(row => row._id === sent._id) ? rows : [...rows, sent]); })}><Ionicons name="send-outline" size={18} color="#171815" /></Pressable></View>
      </>}
      {page === 'assistant' && <>
        <View style={styles.banner}><Ionicons name="sparkles" color="#ffcf1a" size={32} /><Text style={[styles.bannerTitle, styles.flex]}>Hỏi về tài liệu EduShare</Text></View>
        {!turns.length && <View style={styles.wrap}>{['Tìm đề thi miễn phí', 'Có giáo trình cơ sở dữ liệu không?'].map(prompt => <Button key={prompt} caption={prompt} alt onPress={() => setMessage(prompt)} />)}</View>}
        {turns.map((turn, i) => <View key={i} style={styles.panel}>
          <Text style={styles.bold}>{turn.question}</Text><Text style={styles.body}>{turn.answer}</Text>
          {turn.sources.map(source => <Button key={source.id} caption={source.title} alt onPress={() => void run(async () => { setDoc(await api<Listing>('/documents/' + source.id)); open('detail'); })} />)}
        </View>)}
        <Field label="Câu hỏi về tài liệu" value={message} change={setMessage} />
        <Button caption="Gửi câu hỏi" onPress={() => void run(async () => {
          const question = message.trim();
          if (!question) throw new Error('Hãy nhập câu hỏi về tài liệu.');
          const reply = await api<Omit<AiTurn, 'question'>>('/ai/chat', 'POST', { question, history: turns.slice(-4).map(({ question, answer }) => ({ question, answer })) });
          setTurns(current => [...current, { question, ...reply }]); setMessage('');
        })} />
      </>}
      {page === 'report' && <>{card(doc)}<Field label="Lý do báo cáo" value={reason} change={setReason} /><Field label="Mô tả" value={message} change={setMessage} />{evidence && <Image source={{ uri: evidence }} style={styles.picture} />}<Button caption={evidence ? 'Bỏ ảnh minh chứng' : 'Thêm ảnh minh chứng'} alt onPress={() => void run(async () => setEvidence(evidence ? '' : (await pick()) || ''))} /><Button caption="Gửi báo cáo" onPress={() => void run(async () => { await api('/reports', 'POST', { doc: doc.id, reason, description: message, image: evidence || undefined }); open('reportSent'); })} /></>}
      {page === 'reportSent' && <>
        <View style={styles.hero}><Ionicons name="checkmark-circle-outline" size={48} color="#287248" /><Text style={styles.heading}>Đã gửi báo cáo</Text><Text style={styles.body}>EduShare sẽ xem xét nội dung và ảnh minh chứng của bạn.</Text></View>
        <Button caption="Về chi tiết tài liệu" onPress={() => { history.current.pop(); if (!back()) open('detail'); }} />
      </>}
    </ScrollView>
    {['home', 'account', 'inbox', 'saved'].includes(page) && <View style={styles.nav}>
      <Nav icon="home-outline" label="Trang chủ" press={() => open('home')} />
      <Nav icon="bookmark-outline" label="Thư viện" press={() => me ? loadList('/documents/saved', 'saved') : open('login')} />
      <Nav icon="add-circle" label="Đăng" press={() => { setForm(blank); setAiFields([]); setEditing(''); setType('digital'); secured('publish'); }} />
      <Nav icon="chatbubble-outline" label="Chat" press={() => me ? void run(async () => { setContacts(await api<PublicUser[]>('/chat')); open('inbox'); }) : open('login')} />
      <Nav icon="person-outline" label="Hồ sơ" press={() => secured('account')} />
    </View>}
  </SafeAreaView>;

  async function act(id: string, action: string) {
    await run(async () => { await api('/deals/' + id + '/action', 'POST', { action }); setDeals(await api<Deal[]>('/deals')); });
  }
}
function AuthInput({ label, value, change, email, secret }: { label: string; value: string; change: (value: string) => void; email?: boolean; secret?: boolean }) {
  return <TextInput accessibilityLabel={label} value={value} onChangeText={change} placeholder={label} placeholderTextColor="#64645d" secureTextEntry={secret} keyboardType={email ? 'email-address' : 'default'} autoCapitalize={email || secret ? 'none' : 'words'} autoCorrect={false} style={authStyles.input} />;
}
function AuthButton({ caption, press, light, disabled }: { caption: string; press: () => void; light?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={press} style={[authStyles.button, light && authStyles.light]}>
    <Text style={[authStyles.buttonText, light && authStyles.link]}>{caption}</Text>
  </Pressable>;
}
const authStyles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#fff' },
  yellow: { backgroundColor: '#ffbf13' },
  scroll: { flexGrow: 1, width: '100%', maxWidth: 535, alignSelf: 'center' },
  intro: { flex: 1, minHeight: 390, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  illustration: { width: '100%', height: 221, borderRadius: 22, backgroundColor: '#e8e1fc', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  brand: { fontSize: 48, fontWeight: '800', color: '#151512' },
  muted: { color: '#64645d', fontSize: 14 },
  welcomePanel: { backgroundColor: '#ffbf13', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingTop: 32, paddingBottom: 40, gap: 14 },
  header: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 39, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 23 },
  title: { fontSize: 36, fontWeight: '800', color: '#151512' },
  description: { fontSize: 15, lineHeight: 21, color: '#151512' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 15 },
  form: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 31, borderTopRightRadius: 31, padding: 28, paddingTop: 33, gap: 12 },
  input: { minHeight: 49, borderRadius: 25, backgroundColor: '#f2f3f1', paddingHorizontal: 18, color: '#151512', fontSize: 14 },
  school: { minHeight: 48, borderRadius: 20, backgroundColor: '#f2f3f1', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  schoolText: { flex: 1, color: '#35352e', fontSize: 13 },
  submit: { flexDirection: 'row', marginTop: 15 },
  button: { flex: 1, minHeight: 49, borderRadius: 25, backgroundColor: '#151512', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  light: { backgroundColor: '#fff' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  link: { color: '#151512', fontSize: 14, fontWeight: '700' },
  guest: { textAlign: 'center', fontSize: 13, color: '#151512', fontWeight: '600' },
});

function AccountRow({ glyph, caption, press }: { glyph: React.ComponentProps<typeof Ionicons>['name']; caption: string; press: () => void }) {
  return <Pressable accessibilityRole="button" style={styles.accountRow} onPress={press}>
    <Ionicons name={glyph} size={20} color="#33599e" /><Text style={[styles.bold, styles.flex]}>{caption}</Text><Ionicons name="chevron-forward" size={15} color="#171815" />
  </Pressable>;
}
function HomeTile({ name, glyph, color, circle, active, press }: { name: string; glyph: React.ComponentProps<typeof Ionicons>['name']; color: string; circle?: boolean; active?: boolean; press: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: Boolean(active) }} onPress={press} style={styles.tile}>
    <View style={[styles.tileIcon, { backgroundColor: color }, circle && styles.circle, active && styles.tileSelected]}>
      <Ionicons name={glyph} size={21} color="#203448" />
    </View>
    <Text style={styles.tileText}>{name}</Text>
  </Pressable>;
}
function Nav({ icon, label, press }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; press: () => void }) {
  return <Pressable accessibilityRole="button" onPress={press} style={styles.navItem}><Ionicons name={icon} size={21} color="#213347" /><Text style={styles.small}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  detailCover: { width: '100%', height: 143 },
  detailTitle: { color: '#172a41', fontSize: 24, fontWeight: '800' },
  detailPanel: { borderWidth: 1, borderColor: '#dce5f5', borderRadius: 16, backgroundColor: '#fff', padding: 14, gap: 4 },
  splitActions: { flexDirection: 'row', gap: 10 },
  dealLayout: { gap: 12 },
  stage: { backgroundColor: '#fff3ce', borderRadius: 14, padding: 13, gap: 6, minHeight: 76 },
  stageBlue: { backgroundColor: '#e4ebfc' },
  accountHero: { alignItems: 'center', gap: 10, padding: 22, marginBottom: 8, borderRadius: 18, backgroundColor: '#fff2be' },
  accountRow: { minHeight: 52, alignItems: 'center', gap: 12, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', backgroundColor: '#edf1f6' },
  largeAvatar: { width: 96, height: 96, borderRadius: 48 },
  avatarCamera: { position: 'absolute', right: 1, bottom: 1, borderRadius: 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffcd12' },
  aiBanner: { minHeight: 106, borderRadius: 15, backgroundColor: '#fff2c5', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  aiCover: { width: 65, height: 83, borderRadius: 8 },
  composer: { minHeight: 54, borderRadius: 15, backgroundColor: '#edf1f6', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 9 },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffcd12' },
  brandIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#ffcd12', alignItems: 'center', justifyContent: 'center' },
  search: { minHeight: 44, borderRadius: 12, backgroundColor: '#edf1f4', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#171815', paddingVertical: 8 },
  bannerAction: { alignSelf: 'flex-start', marginTop: 10, borderRadius: 16, backgroundColor: '#ffcd12', paddingHorizontal: 11, paddingVertical: 6 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tiles: { flexDirection: 'row', justifyContent: 'space-between' },
  tile: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 3 },
  tileIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  circle: { width: 42, height: 42, borderRadius: 21 },
  tileSelected: { borderColor: '#594308' },
  tileText: { fontSize: 11, fontWeight: '700', color: '#171815', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '3%', rowGap: 10 },
  gridItem: { width: '31.3%', gap: 4, paddingBottom: 12 },
  dealCover: { width: 55, height: 67, borderRadius: 7 },
  wideCover: { width: '100%', height: 95 },
  shell: { flex: 1, backgroundColor: '#fffdfa' },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 20, gap: 12, paddingBottom: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  hero: { backgroundColor: '#fff1bb', padding: 25, borderRadius: 20, alignItems: 'center', gap: 12, marginTop: 10 },
  brand: { fontSize: 45, fontWeight: '900', color: '#172a41' },
  brandSmall: { fontSize: 27, fontWeight: '900', color: '#172a41' },
  heading: { fontSize: 19, fontWeight: '800', color: '#172a41' },
  subtitle: { color: '#35445b', fontSize: 16 },
  bold: { color: '#172a41', fontWeight: '800', fontSize: 14 },
  body: { color: '#35445b', fontSize: 15, lineHeight: 23 },
  small: { color: '#516174', fontSize: 12 },
  price: { color: '#795600', fontWeight: '800', marginTop: 5 },
  button: { paddingVertical: 12, paddingHorizontal: 13, borderRadius: 13, backgroundColor: '#ffcc18', alignItems: 'center', justifyContent: 'center' },
  alt: { backgroundColor: '#eaf0fa' },
  notice: { color: '#914029', backgroundColor: '#fff0e7', padding: 11, borderRadius: 9 },
  field: { padding: 10, backgroundColor: '#edf1f6', borderRadius: 11, gap: 4 },
  input: { color: '#172a41', minHeight: 25, fontSize: 15 },
  banner: { backgroundColor: '#233b53', padding: 18, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bannerText: { color: '#e6edf8', marginTop: 5 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 13, backgroundColor: '#f1f4f9', gap: 12 },
  panel: { backgroundColor: '#f1f4f9', padding: 13, borderRadius: 13, gap: 8 },
  cover: { width: 78, height: 92, borderRadius: 7, justifyContent: 'center', padding: 7, gap: 4 },
  coverTitle: { fontSize: 10, fontWeight: '800', color: '#fff' },
  avatar: { width: 42, height: 42, backgroundColor: '#e7d7fd', borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  picture: { width: '100%', height: 180, resizeMode: 'contain', backgroundColor: '#fff1bb', borderRadius: 12 },
  bubble: { borderRadius: 14, padding: 10, gap: 8, alignItems: 'center', flexDirection: 'row', backgroundColor: '#eaf0fa' },
  mine: { backgroundColor: '#fff0b6', marginLeft: 32, flexDirection: 'row-reverse' },
  nav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, borderTopWidth: 1, borderColor: '#e8e0d1', backgroundColor: '#fff' },
  navItem: { alignItems: 'center', gap: 3, paddingHorizontal: 4 },
});
