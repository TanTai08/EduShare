import { useEffect,useRef,useState } from 'react';
import {
BackHandler,Image,Linking,Platform,Pressable,ScrollView,Text,useWindowDimensions,View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { academicRegions,type Listing,type ListingType,type PublicUser } from '../../../../packages/contracts';
import AdminConsole from '../admin/AdminConsole';
import { sample } from '../sample';
import { styles } from './styles';
import { Button,Field,Avatar,Cover,Nav } from './ui';
import { blank,emptyLibrary,price,searchable,status,type AiTurn,type LibraryData,type Deal,type Message,type ModerationNotice,type Page,type Point,type Review,type User } from './models';
import { emptyEducation, type EducationDraft } from './features/academic/EducationFields';
import { AccountScreen } from './features/account/AccountScreen';
import { DealsScreen } from './features/deals/DealsScreen';
import { formatAppointment, type Appointment } from './features/deals/appointment';
import { AuthScreen } from './features/auth/AuthScreen';
import { MobileHome } from './features/catalog/MobileHome';
import { DocumentScreen } from './features/documents/DocumentScreen';
import { PublishScreen } from './features/publish/PublishScreen';
import { validatePublish } from './features/publish/validation';
import { readPickedPdf } from './features/publish/readPdf';
import { MessagingScreen } from './features/messages/MessagingScreen';
import { LibraryHome,StudentLibrary } from './features/catalog/LibraryHome';
import { Workspace,palette,type Destination } from './Workspace';

import { useAuth } from '../context/AuthContext';
import { endpoint } from '../services/api';

export default function EduShare() {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 900;
  const [page, go] = useState<Page>('welcome');
  const history = useRef<Page[]>([]);
  const scroll = useRef<ScrollView>(null);
  const libraryStart = useRef(0);
  const afterLogin = useRef<Page>('home');
  const { token, user: me, restoredUser, api, signIn, signOut, updateUser } = useAuth();
  const previousToken = useRef('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Listing[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [moderationNotices, setModerationNotices] = useState<ModerationNotice[]>([]);
  const libraryDirty = useRef(false);
  const activeChat = useRef('');
  const [dealFilter, setDealFilter] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [library, setLibrary] = useState(emptyLibrary);
  const [libraryFilter, setLibraryFilter] = useState('');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [list, setList] = useState<Listing[]>([]);
  const [doc, setDoc] = useState<Listing>(sample[0]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('Đà Nẵng');
  const [filter, setFilter] = useState<ListingType | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [registration, setRegistration] = useState<EducationDraft>(emptyEducation);
  const [education, setEducation] = useState<EducationDraft>(emptyEducation);
  const [type, setType] = useState<ListingType>('digital');
  const [form, setForm] = useState(blank);
  const [publishChecked, setPublishChecked] = useState(false);
  const [aiFields, setAiFields] = useState<string[]>([]);
  const [editing, setEditing] = useState('');
  const [place, setPlace] = useState('');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
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
  useEffect(() => {
    if (desktop) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [desktop, page]);

  function secured(next: Page) {
    if (!me) { afterLogin.current = next; open('login'); return; }
    open(next);
  }
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    return () => subscription.remove();
  }, [page]);
  useEffect(() => {
    if (!restoredUser) return;
    setRegion(restoredUser.region);
    go('home');
  }, [restoredUser]);
  useEffect(() => {
    const previous = previousToken.current;
    previousToken.current = token;
    if (!previous || token) return;
    setTurns([]); setDeals([]); setSelectedDeal(''); setList([]); setContacts([]); setContactQuery(''); setDealFilter(''); setMessages([]);
    setMessage(''); setChatDocument(null); setReviews([]); setPoints({ balance: 0, entries: [] }); setForm(blank); setPublishChecked(false); setAiFields([]); setEditing('');
    setProfileName(''); setAvatar(''); setEducation(emptyEducation); setEvidence(''); setReason(''); setReviewDeal(''); setPlace(''); setAppointment(null);
    activeChat.current = ''; libraryDirty.current = false; setLibrary(emptyLibrary); setLibraryFilter(''); setLibraryQuery(''); setModerationNotices([]);
    afterLogin.current = 'home'; history.current = []; go('welcome');
  }, [token]);
  useEffect(() => {
    if (page !== 'home' || me?.role === 'admin') return;
    let alive = true;
    setCatalogState('loading');
    void api<Listing[]>('/documents?region=' + encodeURIComponent(region) + (filter ? '&type=' + filter : '')).then(rows => {
      if (alive) { setItems(rows); setCatalogState('ready'); }
    }).catch(() => { if (alive) { setItems([]); setCatalogState('error'); } });
    return () => { alive = false; };
  }, [page, region, filter, catalogRefresh, me?.role]);
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
    if (page === 'register' && !registration.schoolId) throw new Error('Vui lòng chọn khu vực và trường.');
    const response = page === 'register'
      ? await signIn('register', { name, email, password, schoolId: registration.schoolId, majorId: registration.majorId,
        specializationId: registration.specializationId })
      : await signIn('login', { email, password });
    setRegistration(emptyEducation); setRegion(response.user.region); setPassword(''); setConfirmation('');
    const destination = afterLogin.current;
    afterLogin.current = 'home'; history.current = destination === 'home' ? [] : ['home'];
    setNotice(''); go('home');
    if (response.user.role === 'student' && destination !== 'home') {
      await loadWorkspaceData(destination, response.token);
      go(destination);
    }
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
  const logout = () => void run(signOut);
  async function loadWorkspaceData(destination: Page, session = token) {
    if (destination === 'saved') {
      if (Platform.OS === 'web') {
        const data = await api<LibraryData>('/documents/library', 'GET', undefined, session);
        libraryDirty.current = false;
        setLibrary(data);
        setList(data.rows.filter(row => data.saved.includes(row.id)));
      } else setList(await api<Listing[]>('/documents/saved', 'GET', undefined, session));
    }
    if (destination === 'inbox') setContacts(await api<PublicUser[]>('/chat', 'GET', undefined, session));
    if (destination === 'wallet') setPoints(await api<typeof points>('/points', 'GET', undefined, session));
    if (destination === 'deals' || destination === 'notifications') {
      const [rows, notices] = await Promise.all([api<Deal[]>('/deals', 'GET', undefined, session),
        destination === 'notifications' ? api<ModerationNotice[]>('/notifications/moderation', 'GET', undefined, session) : Promise.resolve([])]);
      setDeals(rows); setModerationNotices(notices);
    }
  }
  function openWorkspacePage(destination: Page) {
    if (!me) { secured(destination); return; }
    void run(async () => { await loadWorkspaceData(destination); open(destination); });
  }
  function openInbox() {
    if (!me) { open('login'); return; }
    void run(async () => { setContacts(await api<PublicUser[]>('/chat')); open('inbox'); });
  }
  function openDeal(id: string) { setSelectedDeal(id); open('dealProgress'); }
  function showDeals(destination: 'deals' | 'notifications' = 'deals') { openWorkspacePage(destination); }
  function startPublish() {
    if (page !== 'publish' && page !== 'preview') {
      setForm(blank); setPublishChecked(false); setAiFields([]); setEditing(''); setType('digital');
    }
    secured('publish');
  }
  async function sendMessage() {
    const draft = message.trim();
    if (!draft) return;
    const recipient = peer.id;
    const sent = await api<Message>('/chat/' + recipient, 'POST', { text: draft });
    if (activeChat.current !== recipient) return;
    setMessage(current => current.trim() === draft ? '' : current);
    setMessages(rows => rows.some(row => row._id === sent._id) ? rows : [...rows, sent]);
  }
  function bookListing() {
    if (me && doc.owner.id === me.id) { setNotice('Đây là tài liệu của bạn.'); return; }
    if (me && doc.owner.region !== me.region) { setNotice('Tài liệu này giao nhận tại ' + doc.owner.region + '. Hãy chọn tài liệu cùng khu vực với trường của bạn.'); return; }
    setPlace(''); setAppointment(null); secured('appointment');
  }
  function saveListing() {
    if (!me) { secured('detail'); return; }
    void run(async () => {
      const { saved } = await api<{ saved: boolean }>('/documents/' + doc.id + '/save', 'POST', { saved: !me.saved.includes(doc.id) });
      libraryDirty.current = true;
      updateUser({ ...me, saved: saved ? [...me.saved, doc.id] : me.saved.filter(id => id !== doc.id) });
    });
  }
  function reportListing() { setReason(''); setEvidence(''); secured('report'); }
  function showListing(value: Listing) { setDoc(value); open('detail'); }
  function clearCatalog() { setQ(''); setCategory(''); setFilter(''); }
  function submitSearch() {
    setCategory(''); setFilter('');
    if (page !== 'home') open('home');
    else scroll.current?.scrollTo({ y: libraryStart.current, animated: true });
  }
  function openPdf() {
    if (busy) return;
    const popup = Platform.OS === 'web' ? window.open('about:blank', '_blank') : null;
    if (popup) popup.opener = null;
    void run(async () => {
      try {
        const target = doc.id.startsWith('sample') ? { url: doc.fileUrl } :
          await api<{ url?: string; path?: string }>('/documents/' + doc.id + '/open', 'POST');
        const url = target.url || (target.path ? endpoint + target.path : '');
        if (!url) throw new Error('Chưa có tệp PDF.');
        if (me) libraryDirty.current = true;
        if (popup) popup.location.replace(url);
        else await Linking.openURL(url);
        open('pdfOpened');
      } catch (error) {
        popup?.close();
        throw error;
      }
    });
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
    if (page === 'chat' && peer.id === user.id) return;
    activeChat.current = user.id; setPeer(user); setChatDocument(listing); setMessages([]); setMessage(''); open('chat');
  }
  useEffect(() => {
    if (!desktop || !token || page !== 'chat') return;
    let alive = true;
    void api<PublicUser[]>('/chat').then(rows => { if (alive) setContacts(rows); }).catch(() => {});
    void api<Deal[]>('/deals').then(rows => { if (alive) setDeals(rows); }).catch(() => {});
    return () => { alive = false; };
  }, [desktop, token, page, api]);
  useEffect(() => {
    if (!token || Platform.OS !== 'web' || page !== 'saved' || !libraryDirty.current) return;
    let alive = true;
    void api<LibraryData>('/documents/library').then(data => {
      if (!alive) return;
      libraryDirty.current = false;
      setLibrary(data);
      setList(data.rows.filter(row => data.saved.includes(row.id)));
    }).catch(error => { if (alive) setNotice(error instanceof Error ? error.message : 'Chưa tải được thư viện.'); });
    return () => { alive = false; };
  }, [token, page, api]);
  function chooseType(value: ListingType) { setType(value); }
  function formField(key: keyof typeof blank) { return (value: string) => { setForm(current => ({ ...current, [key]: value })); setAiFields(fields => key === 'cover' ? [] : fields.filter(field => field !== key)); }; }
  const validateDraft = () => validatePublish(form, type, Boolean(editing && form.fileName));
  function previewDraft() {
    setPublishChecked(true);
    setNotice('');
    if (!Object.keys(validateDraft()).length) open('preview');
  }
  const submit = () => run(async () => {
    if (Object.keys(validateDraft()).length) {
      setPublishChecked(true);
      open('publish');
      return;
    }
    await api(editing ? '/documents/' + editing : '/documents', editing ? 'PATCH' : 'POST', {
      title: form.title, subject: form.subject, category: form.category, description: form.description,
      type, price: type === 'digital' ? 0 : Number(form.cost), cover: form.cover || undefined,
      fileUrl: type === 'digital' ? form.fileUrl.trim() || undefined : undefined,
      pdf: type === 'digital' ? form.pdf || undefined : undefined,
      fileName: type === 'digital' ? form.fileName || undefined : undefined,
    });
    setForm(blank); setPublishChecked(false); setAiFields([]); setEditing(''); open('posted');
  });
  function card(value: Listing, press?: () => void) {
    return <Pressable key={value.id} style={styles.card} onPress={press || (() => showListing(value))}>
      <Cover doc={value} /><View style={styles.flex}><Text style={styles.bold}>{value.title}</Text><Text style={styles.small}>{value.owner?.name}</Text><Text style={styles.small}>{value.owner?.school}</Text><Text style={styles.price}>{price(value)}</Text></View>
    </Pressable>;
  }
  function toggleFilter(value: ListingType) { setQ(''); setCategory(''); setFilter(current => current === value ? '' : value); }
  const keyword = desktop ? searchable(q.trim()) : q.toLowerCase();
  const matches = items.filter(item => {
    const values = [item.title, item.subject, item.category, item.owner?.school];
    if (desktop) values.push(item.owner?.name);
    const matchesKeyword = values.some(value => (desktop ? searchable(value || '') : (value || '').toLowerCase()).includes(keyword));
    return matchesKeyword && (!desktop || !category || searchable(item.category || '').includes(searchable(category)));
  });
  if (me?.role === 'admin') return <AdminConsole api={api} endpoint={endpoint} me={me} logout={logout} logoutBusy={busy} logoutError={notice} />;
  if (page === 'welcome' || page === 'login' || page === 'register') {
    return <AuthScreen page={page} desktop={desktop} open={open} leaveAuth={() => {
      const previous = history.current.at(-1);
      if (previous !== 'login' && previous !== 'register') afterLogin.current = 'home';
      if (!desktop || !back()) open('welcome');
    }} name={name} setName={setName} email={email} setEmail={setEmail} password={password} setPassword={setPassword}
      confirmation={confirmation} setConfirmation={setConfirmation} education={registration} setEducation={setRegistration} notice={notice} busy={busy} authenticate={authenticate} />;
  }
  const heading: Partial<Record<Page, string>> = { login: 'Đăng nhập', register: 'Đăng ký', detail: 'Chi tiết tài liệu', publish: 'Đăng tài liệu', preview: 'Xem trước bài đăng', posted: 'Đã gửi duyệt', account: 'Hồ sơ của tôi', saved: 'Tài liệu đã lưu', mine: 'Bài đăng của tôi', deals: 'Lịch sử giao dịch', appointment: 'Đặt lịch nhận', wallet: 'Ví điểm', inbox: 'Tin nhắn', chat: peer.name, profile: 'Hồ sơ công khai', assistant: 'Trợ lý AI', report: 'Báo cáo tài liệu', edit: 'Chỉnh sửa hồ sơ', review: 'Đánh giá giao dịch', region: 'Khu vực giao dịch', notifications: 'Thông báo', dealProgress: 'Tiến trình giao dịch', pdfOpened: 'Tài liệu PDF', reportSent: 'Đã gửi báo cáo' };
  const destinations: Destination[] = [
    { key: 'home', label: 'Trang chủ', icon: 'home-outline', open: () => { clearCatalog(); open('home'); scroll.current?.scrollTo({ y: 0 }); } },
    { key: 'saved', label: 'Thư viện', icon: 'bookmark-outline', open: () => { setLibraryFilter(''); setLibraryQuery(''); openWorkspacePage('saved'); } },
    { key: 'publish', label: 'Đăng tài liệu', icon: 'add-circle-outline', open: startPublish },
    { key: 'inbox', label: 'Tin nhắn', icon: 'chatbubble-outline', open: () => openWorkspacePage('inbox') },
    { key: 'deals', label: 'Giao dịch', icon: 'swap-horizontal-outline', open: () => { setDealFilter(''); showDeals(); } },
    { key: 'assistant', label: 'Trợ lý AI', icon: 'sparkles-outline', open: () => secured('assistant') },
    { key: 'account', label: 'Hồ sơ', icon: 'person-circle-outline', open: () => secured('account') },
  ];
  const active = ['preview', 'posted'].includes(page) ? 'publish' : ['edit', 'mine', 'wallet'].includes(page) ? 'account' :
    page === 'chat' ? 'inbox' : ['appointment', 'dealProgress', 'review'].includes(page) ? 'deals' : page;
  const isWidePage = ['home', 'saved', 'detail', 'account', 'publish'].includes(page);
  const readCover = () => void run(async () => {
      const result = await api<Partial<typeof blank>>('/ai/cover', 'POST', { cover: form.cover });
      setAiFields(Object.entries(result).filter(([, value]) => Boolean(value)).map(([key]) => key));
      setForm(old => ({ ...old, title: result.title || old.title, subject: result.subject || old.subject, category: result.category || old.category, description: result.description || old.description }));
    });
  const pickPdf = () => void run(async () => {
    const selected = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: false, copyToCacheDirectory: true });
    if (selected.canceled || !selected.assets[0]) return;
    const picked = selected.assets[0];
    const pdf = await readPickedPdf(picked);
    setForm(current => ({ ...current, pdf, fileName: picked.name, fileUrl: '' }));
  });
  const visibleDeals = !desktop || !dealFilter ? deals : deals.filter(deal =>
    deal.status === dealFilter || (dealFilter === 'scheduled' && deal.status === 'waiting'));
  const visibleContacts = desktop ? contacts.filter(user => searchable(user.name).includes(searchable(contactQuery.trim()))) : contacts;
  const relatedDeal = desktop && page === 'chat' ? deals.find(deal =>
    deal.counterparty?.id === peer.id && ['requested', 'scheduled', 'waiting'].includes(deal.status)) : undefined;
  const content = (
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={desktop && styles.webScroll}
      contentContainerStyle={[styles.content, desktop && (isWidePage ? styles.webWide : styles.webPage)]}>
      {heading[page] && (desktop ? <View style={styles.webHeading}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => { if (!back()) open('home'); }} style={styles.webBack}><Ionicons name="arrow-back" size={19} color={palette.navy} /></Pressable>
        <Text accessibilityRole="header" aria-level={1} style={styles.webTitle}>{heading[page]}</Text>
      </View> : <Pressable accessibilityRole="button" onPress={() => { if (!back()) open('home'); }} style={styles.row}><Ionicons name="arrow-back" size={22} /><Text style={styles.heading}>{heading[page]}</Text></Pressable>)}
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
      {busy && <Text aria-live="polite" style={styles.small}>Đang xử lý…</Text>}
      {page === 'home' && desktop && <LibraryHome rows={matches} status={catalogState} width={width} region={region} filter={filter}
        keyword={q} category={category} onCategory={value => { setFilter(''); setQ(''); setCategory(current => current === value ? '' : value); }}
        onFilter={toggleFilter} onReset={clearCatalog} onRetry={() => setCatalogRefresh(n => n + 1)}
        onChat={() => openWorkspacePage('inbox')} onRegion={() => open('region')} onAssistant={() => secured('assistant')}
        onBrowse={() => scroll.current?.scrollTo({ y: libraryStart.current, animated: true })}
        onCatalogLayout={offset => { libraryStart.current = offset; }} onOpen={showListing} />}
      {page === 'home' && !desktop && <MobileHome q={q} setQ={setQ} filter={filter} setFilter={setFilter} toggleFilter={toggleFilter}
        catalogState={catalogState} matches={matches} region={region} onNotifications={() => showDeals('notifications')} onChat={openInbox}
        onRetry={() => setCatalogRefresh(n => n + 1)} onOpen={showListing} onRegion={() => open('region')} onAssistant={() => secured('assistant')} />}
      {page === 'region' && <>
        <View style={styles.panel}><Text style={styles.bold}>Khu vực hồ sơ</Text><Text>{me?.region || 'Chọn trường khi đăng ký.'}</Text><Text style={styles.small}>Mua bán và nhận bằng điểm áp dụng trong cùng khu vực. PDF miễn phí có thể tải ở mọi nơi.</Text></View>
        {['Đà Nẵng', 'Huế'].map(value => <Button key={value} caption={value} onPress={() => { setRegion(value); open('home'); }} alt={value !== region} />)}
      </>}
      {page === 'notifications' && moderationNotices.map(entry => <View key={entry.id} style={styles.panel}>
        <Text style={styles.bold}>{status[entry.action] || entry.action}</Text><Text>{entry.title}</Text>
        {!!entry.note && <Text style={styles.body}>{entry.note}</Text>}
        <Text style={styles.small}>{new Date(entry.createdAt).toLocaleString('vi-VN')}</Text>
      </View>)}
      {page === 'notifications' && (deals.length ? deals.map(deal => <Pressable accessibilityRole="button" key={deal._id} style={styles.panel} onPress={() => { setSelectedDeal(deal._id); open('dealProgress'); }}>
        <Text style={styles.bold}>{status[deal.status]}</Text><Text>{deal.document?.title || 'Tài liệu'}</Text><Text style={styles.small}>{deal.counterparty?.name} · {deal.time}</Text>
      </Pressable>) : !moderationNotices.length && <Text>Chưa có thông báo.</Text>)}
      {(page === 'detail' || page === 'pdfOpened') && <DocumentScreen page={page} desktop={desktop} doc={doc} saved={!!me?.saved.includes(doc.id)}
        onOpenPdf={openPdf} onBook={bookListing} onChat={startChat} onSave={saveListing} onReport={reportListing} onProfile={showPeer}
        onBackToDetail={() => { if (!back()) open('detail'); }} onHome={() => open('home')} />}
      {(page === 'appointment' || page === 'deals' || page === 'dealProgress' || page === 'review') && <DealsScreen page={page} desktop={desktop} doc={doc}
        listingCard={page === 'appointment' ? card(doc) : null} place={place} setPlace={setPlace} appointment={appointment}
        setAppointment={value => { setAppointment(value); setNotice(''); }}
        onBook={() => void run(async () => {
          if (!place.trim()) throw new Error('Vui lòng nhập điểm hẹn.');
          if (!appointment) throw new Error('Vui lòng chọn ngày và giờ hẹn.');
          const created = await api<Deal>('/deals', 'POST', { doc: doc.id, location: place.trim(), time: formatAppointment(appointment) });
          setSelectedDeal(created._id);
          setDeals(current => [{ ...created, document: { title: doc.title, cover: doc.cover }, counterparty: doc.owner }, ...current]);
          open('dealProgress');
        })}
        dealFilter={dealFilter} setDealFilter={setDealFilter} visibleDeals={visibleDeals} deals={deals} selectedDeal={selectedDeal} onSelectDeal={openDeal}
        showPeer={showPeer} startChat={startChat} me={me} act={act}
        onReview={id => { setReviewDeal(id); setRating(5); open('review'); }}
        rating={rating} setRating={setRating} message={message} setMessage={setMessage}
        onReviewSubmit={() => void run(async () => {
          await api('/reviews', 'POST', { deal: reviewDeal, rating, text: message });
          if (!back()) open('dealProgress');
          setNotice('Đã gửi đánh giá.');
        })} />}
      {(page === 'publish' || page === 'preview' || page === 'posted') && <PublishScreen page={page} desktop={desktop} form={form} aiFields={aiFields} errors={publishChecked ? validateDraft() : {}}
        type={type} chooseType={chooseType} formField={formField} onCover={() => void run(async () => { const value = await pick(); if (value) formField('cover')(value); })}
        onReadCover={readCover} onPickPdf={pickPdf} onPdfUrl={value => setForm(current => ({ ...current, fileUrl: value, pdf: '', fileName: '' }))}
        onPreview={previewDraft} onSubmit={() => void submit()} onEdit={() => open('publish')} onMine={() => loadList('/documents/mine', 'mine')} />}
      {(page === 'account' || page === 'edit') && me && <AccountScreen page={page} desktop={desktop} me={me} avatar={avatar} profileName={profileName}
        setProfileName={setProfileName} education={education} setEducation={setEducation}
        onEdit={() => {
          setProfileName(me.name); setAvatar(me.avatar || '');
          setEducation({ region: academicRegions.find(item => item.name === me.region)?.id || '', schoolId: me.schoolId || '',
            majorId: me.majorId, specializationId: me.specializationId });
          open('edit');
        }}
        onSaved={() => { setLibraryFilter('saved'); openWorkspacePage('saved'); }} onMine={() => loadList('/documents/mine', 'mine')}
        onDeals={() => showDeals()} onWallet={() => openWorkspacePage('wallet')} onLogout={logout}
        onPickAvatar={() => void run(async () => { const value = await pick(); if (value) setAvatar(value); })}
        onSaveProfile={() => void run(async () => {
          if (!education.schoolId) throw new Error('Vui lòng chọn khu vực và trường.');
          const user = await api<User>('/me', 'PATCH', { name: profileName, avatar: avatar || undefined, education });
          updateUser(user);
          if (user.region !== me.region) setRegion(user.region);
          open('account');
        })} />}
      {page === 'saved' && (desktop ? <StudentLibrary data={library} selected={libraryFilter} choose={setLibraryFilter} query={libraryQuery}
        change={setLibraryQuery} onOpen={showListing} onBrowse={() => open('home')} width={width} /> :
        list.length ? list.map(item => card(item)) : <Text>Chưa có tài liệu đã lưu.</Text>)}
      {page === 'mine' && (list.length ? list.map(item => <View key={item.id} style={styles.panel}>
        {card(item)}<Text>{status[item.status]}</Text>{!!item.feedback && <Text style={styles.small}>{item.feedback}</Text>}
        {item.status === 'revision' && <Button caption="Sửa và gửi lại" onPress={() => { setEditing(item.id); setPublishChecked(false); setAiFields([]); setType(item.type); setForm({ title: item.title, subject: item.subject, category: item.category, description: item.description, cover: item.cover || '', cost: String(item.price), fileUrl: item.fileUrl || '', fileName: item.fileName || '', pdf: '' }); open('publish'); }} />}
      </View>) : <Text>Chưa có bài đăng.</Text>)}
      {page === 'wallet' && <><View style={styles.hero}><Text style={styles.heading}>{points.balance} điểm khả dụng</Text></View>{points.entries.map(p => <View key={p._id} style={styles.panel}><Text style={styles.bold}>{p.amount > 0 ? '+' : ''}{p.amount} điểm</Text><Text>{p.reason}</Text></View>)}</>}
      {page === 'profile' && <><View style={styles.hero}><Avatar user={peer} /><Text style={styles.heading}>{peer.name}</Text><Text>{peer.school}</Text><Text>{reviewItems.length ? (reviewItems.reduce((sum, r) => sum + r.rating, 0) / reviewItems.length).toFixed(1) + ' ★' : 'Chưa có đánh giá'}</Text></View><Button caption="Nhắn tin" onPress={() => startChat(peer)} />{reviewItems.map(r => <View key={r._id} style={styles.panel}><Text style={styles.bold}>{r.rating} ★</Text><Text>{r.text}</Text></View>)}</>}
      {(page === 'inbox' || page === 'chat') && <MessagingScreen page={page} desktop={desktop} contactQuery={contactQuery} setContactQuery={setContactQuery}
        visibleContacts={visibleContacts} startChat={startChat} showPeer={showPeer} peer={peer} chatDocument={chatDocument} onOpen={showListing}
        relatedDeal={relatedDeal} onDeal={openDeal} messages={messages} me={me} message={message} setMessage={setMessage} busy={busy} onSend={() => void run(sendMessage)} />}
      {page === 'assistant' && <>
        <View style={[styles.banner, desktop && styles.webAssistant]}><Ionicons name="sparkles" color={desktop ? "#826009" : "#ffcf1a"} size={32} /><Text style={[styles.bannerTitle, styles.flex, desktop && styles.webAssistantTitle]}>Hỏi về tài liệu EduShare</Text></View>
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
  );
  return <SafeAreaView style={[styles.shell, desktop && styles.webShell]}>
    {desktop ? <Workspace title={heading[page] || 'Trang chủ'} active={active} destinations={destinations} user={me} region={region}
      home={destinations[0].open} changeRegion={() => open('region')} notifications={() => showDeals('notifications')}
      account={() => secured('account')} register={() => open('register')}
      search={{ value: q, change: setQ, submit: submitSearch }}>{content}</Workspace> : content}
    {!desktop && ['home', 'account', 'inbox', 'saved'].includes(page) && <View style={styles.nav}>
      <Nav icon="home-outline" label="Trang chủ" press={() => open('home')} />
      <Nav icon="bookmark-outline" label="Thư viện" press={() => openWorkspacePage('saved')} />
      <Nav icon="add-circle" label="Đăng" press={() => { setForm(blank); setPublishChecked(false); setAiFields([]); setEditing(''); setType('digital'); secured('publish'); }} />
      <Nav icon="chatbubble-outline" label="Chat" press={openInbox} />
      <Nav icon="person-outline" label="Hồ sơ" press={() => secured('account')} />
    </View>}
  </SafeAreaView>;

  async function act(id: string, action: string) {
    await run(async () => { await api('/deals/' + id + '/action', 'POST', { action }); setDeals(await api<Deal[]>('/deals')); });
  }
}
