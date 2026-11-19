import { useEffect, useState } from 'react';
import {
  Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
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
type Deal = { _id: string; buyer: string; seller: string; type: string; price: number; time: string; location: string; status: string; confirmations: string[]; document?: { title: string; cover?: string } };
type Message = { _id: string; from: string; text: string };
type Point = { _id: string; amount: number; reason: string };
type Review = { _id: string; rating: number; text: string };
type Page = 'welcome' | 'login' | 'register' | 'home' | 'detail' | 'publish' | 'preview' | 'posted' | 'account' | 'saved' | 'mine' | 'wallet' | 'deals' | 'appointment' | 'inbox' | 'chat' | 'profile' | 'assistant' | 'report' | 'moderation' | 'edit' | 'review';
const status: Record<string, string> = { requested: 'Chờ người đăng xác nhận', scheduled: 'Đã hẹn', waiting: 'Chờ bên còn lại xác nhận', completed: 'Hoàn tất', cancelled: 'Đã hủy', pending: 'Chờ duyệt', approved: 'Đã duyệt', revision: 'Cần sửa' };
const money = (n: number) => n.toLocaleString('vi-VN') + ' ₫';
const price = (doc: Listing) => doc.type === 'digital' ? 'Miễn phí' : doc.type === 'sale' ? money(doc.price) : doc.price + ' điểm';
const blank = { title: '', subject: '', category: '', description: '', cost: '', fileUrl: '', cover: '', pdf: '', fileName: '' };

function Button({ caption, onPress, alt = false }: { caption: string; onPress: () => void; alt?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, alt && styles.alt]}><Text style={styles.bold}>{caption}</Text></Pressable>;
}
function Field({ label, value, change, secret = false }: { label: string; value: string; change: (s: string) => void; secret?: boolean }) {
  return <View style={styles.field}><Text style={styles.small}>{label}</Text><TextInput accessibilityLabel={label} placeholder={label} autoCapitalize="none" secureTextEntry={secret} value={value} onChangeText={change} style={styles.input} /></View>;
}
function Avatar({ user }: { user: PublicUser }) {
  return user.avatar ? <Image source={{ uri: user.avatar }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.bold}>{user.name.slice(0, 1)}</Text></View>;
}
function Cover({ doc }: { doc: Listing }) {
  return doc.cover ? <Image source={{ uri: doc.cover }} style={styles.cover} /> : <View style={[styles.cover, { backgroundColor: doc.type === 'sale' ? '#234569' : doc.type === 'points' ? '#355D53' : '#554579' }]}><Ionicons name="book-outline" color="#ffdc55" size={24} /><Text style={styles.coverTitle} numberOfLines={3}>{doc.title}</Text></View>;
}
export default function EduShare() {
  const [page, go] = useState<Page>('welcome');
  const [token, setToken] = useState('');
  const [me, setMe] = useState<User | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Listing[]>(sample);
  const [list, setList] = useState<Listing[]>([]);
  const [doc, setDoc] = useState<Listing>(sample[0]);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('Đà Nẵng');
  const [filter, setFilter] = useState<ListingType | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchool] = useState<string>(schools[0].id);
  const [type, setType] = useState<ListingType>('digital');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState('');
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');
  const [peer, setPeer] = useState<PublicUser>(sample[0].owner);
  const [contacts, setContacts] = useState<PublicUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviewItems, setReviews] = useState<Review[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [points, setPoints] = useState<{ balance: number; entries: Point[] }>({ balance: 0, entries: [] });
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
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
  function open(next: Page) { setNotice(''); setMessage(''); go(next); }
  function secured(next: Page) {
    if (!me) { open('login'); return; }
    open(next);
  }
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
    void api<Listing[]>('/documents?region=' + encodeURIComponent(region) + (filter ? '&type=' + filter : '')).then(rows => {
      if (alive) setItems(rows);
    }).catch(() => { if (alive) setItems(sample.filter(doc => (!filter || doc.type === filter) && (doc.type === 'digital' || doc.owner.region === region))); });
    return () => { alive = false; };
  }, [page, region, filter]);
  useEffect(() => {
    if (!token || page !== 'chat') return;
    let alive = true;
    const refresh = () => void api<Message[]>('/chat/' + peer.id).then(rows => { if (alive) setMessages(rows); }).catch(() => {});
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => { alive = false; clearInterval(interval); };
  }, [token, page, peer.id]);
  const authenticate = () => run(async () => {
    const response = await api<{ token: string; user: User }>(page === 'register' ? '/auth/register' : '/auth/login', 'POST',
      page === 'register' ? { name, email, password, schoolId } : { email, password });
    await AsyncStorage.setItem('edushare-session', response.token);
    setMe(response.user); setToken(response.token); setRegion(response.user.region); setPassword(''); open('home');
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
  function showDeals() { void run(async () => { setDeals(await api<Deal[]>('/deals')); open('deals'); }); }
  function showPeer(user: PublicUser) {
    setPeer(user); setReviews([]); open('profile');
    if (!user.id.startsWith('sample')) void run(async () => setReviews((await api<{ reviews: Review[] }>('/users/' + user.id)).reviews));
  }
  function startChat(user: PublicUser) {
    if (!me) { open('login'); return; }
    if (user.id.startsWith('sample')) { setNotice('Hãy chọn tài liệu đã lưu trên máy chủ để nhắn tin.'); return; }
    setPeer(user); setMessages([]); open('chat');
  }
  function chooseType(value: ListingType) { setType(value); }
  function formField(key: keyof typeof blank) { return (value: string) => setForm(current => ({ ...current, [key]: value })); }
  const submit = () => run(async () => {
    await api(editing ? '/documents/' + editing : '/documents', editing ? 'PATCH' : 'POST', {
      title: form.title, subject: form.subject, category: form.category, description: form.description,
      type, price: type === 'digital' ? 0 : Number(form.cost), cover: form.cover || undefined,
      fileUrl: type === 'digital' ? form.fileUrl || undefined : undefined,
      pdf: type === 'digital' ? form.pdf || undefined : undefined,
      fileName: type === 'digital' ? form.fileName || undefined : undefined,
    });
    setForm(blank); setEditing(''); open('posted');
  });
  function card(value: Listing, press?: () => void) {
    return <Pressable key={value.id} style={styles.card} onPress={press || (() => { setDoc(value); open('detail'); })}>
      <Cover doc={value} /><View style={styles.flex}><Text style={styles.bold}>{value.title}</Text><Text style={styles.small}>{value.owner.name}</Text><Text style={styles.small}>{value.owner.school}</Text><Text style={styles.price}>{price(value)}</Text></View>
    </Pressable>;
  }
  const matches = items.filter(item => [item.title, item.subject, item.category, item.owner.school].some(v => v.toLowerCase().includes(q.toLowerCase())));
  const heading: Partial<Record<Page, string>> = { login: 'Đăng nhập', register: 'Đăng ký', detail: 'Chi tiết tài liệu', publish: 'Đăng tài liệu', preview: 'Xem trước bài đăng', posted: 'Đã gửi duyệt', account: 'Hồ sơ của tôi', saved: 'Tài liệu đã lưu', mine: 'Bài đăng của tôi', deals: 'Lịch sử giao dịch', appointment: 'Đặt lịch nhận', wallet: 'Ví điểm', inbox: 'Tin nhắn', chat: peer.name, profile: 'Hồ sơ công khai', assistant: 'Trợ lý AI', report: 'Báo cáo tài liệu', moderation: 'Duyệt bài đăng', edit: 'Chỉnh sửa hồ sơ', review: 'Đánh giá giao dịch' };
  return <SafeAreaView style={styles.shell}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {heading[page] && <Pressable accessibilityRole="button" onPress={() => open('home')} style={styles.row}><Ionicons name="arrow-back" size={22} /><Text style={styles.heading}>{heading[page]}</Text></Pressable>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
      {busy && <Text style={styles.small}>Đang xử lý…</Text>}
      {page === 'welcome' && <><View style={styles.hero}><Ionicons name="library" size={64} color="#223954" /><Text style={styles.brand}>EduShare</Text><Text style={styles.subtitle}>Kho tài liệu dành cho sinh viên</Text></View><Button caption="Đăng nhập" onPress={() => open('login')} /><Button caption="Đăng ký" onPress={() => open('register')} alt /><Button caption="Khám phá tài liệu" onPress={() => open('home')} alt /></>}
      {(page === 'login' || page === 'register') && <>
        {page === 'register' && <><Field label="Họ và tên" value={name} change={setName} /><Text style={styles.bold}>Trường của bạn</Text>{schools.map(s => <Button key={s.id} caption={s.name} onPress={() => setSchool(s.id)} alt={schoolId !== s.id} />)}</>}
        <Field label="Email sinh viên" value={email} change={setEmail} /><Field label="Mật khẩu" value={password} change={setPassword} secret />
        <Button caption={page === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} onPress={authenticate} />
        <Button caption={page === 'login' ? 'Tạo tài khoản mới' : 'Đã có tài khoản'} onPress={() => open(page === 'login' ? 'register' : 'login')} alt />
      </>}
      {page === 'home' && <>
        <View style={styles.row}><Ionicons name="library" size={23} color="#9d6a00" /><Text style={styles.brandSmall}>EduShare</Text></View>
        <Field label="Tìm tài liệu, môn học hoặc trường" value={q} change={setQ} />
        <View style={styles.banner}><View style={styles.flex}><Text style={styles.bannerTitle}>Tủ tài liệu cho kỳ thi</Text><Text style={styles.bannerText}>Học cùng cộng đồng sinh viên</Text></View><Ionicons name="book-outline" color="#ffcf1a" size={46} /></View>
        <View style={styles.wrap}>{[['Mua bán', 'bản in'], ['Đổi điểm', 'điểm'], ['Chat', ''], ['Miễn phí', '']].map(([label], i) => <Button key={label} caption={label} alt onPress={() => {
          if (i === 2) { if (!me) open('login'); else void run(async () => { setContacts(await api<PublicUser[]>('/chat')); open('inbox'); }); return; }
          setQ(''); const t = i === 0 ? 'sale' : i === 1 ? 'points' : 'digital';
          setFilter(current => current === t ? '' : t);
        }} />)}</View>
        <Text style={styles.heading}>Khu vực giao nhận</Text><View style={styles.wrap}>{['Đà Nẵng', 'Huế'].map(value => <Button key={value} caption={value} onPress={() => setRegion(value)} alt={value !== region} />)}</View>
        <Text style={styles.heading}>Danh mục nổi bật</Text><View style={styles.wrap}>{['Giáo trình', 'Slide', 'Đề thi', 'PDF'].map(value => <Button key={value} caption={value} alt onPress={() => setQ(value === 'PDF' ? '' : value)} />)}</View>
        <Text style={styles.heading}>{filter ? listingLabels[filter] : 'Tài liệu nổi bật'}</Text>{matches.length ? matches.map(item => card(item)) : <Text style={styles.small}>Chưa tìm thấy tài liệu phù hợp.</Text>}
        <Button caption="Hỏi Trợ lý AI" onPress={() => { setAnswer(''); secured('assistant'); }} alt />
      </>}
      {page === 'detail' && <>
        {card(doc, () => showPeer(doc.owner))}
        <Text style={styles.heading}>Giới thiệu tài liệu</Text><Text style={styles.body}>{doc.description}</Text>
        <Pressable style={styles.card} onPress={() => showPeer(doc.owner)}><Avatar user={doc.owner} /><View style={styles.flex}><Text style={styles.bold}>{doc.owner.name}</Text><Text style={styles.small}>{doc.owner.school}</Text></View><Ionicons name="chevron-forward" size={18} /></Pressable>
        {doc.type === 'digital' ? <Button caption="Mở PDF miễn phí" onPress={() => void run(async () => { const target = doc.fileUrl || (doc.fileName ? endpoint + '/documents/' + doc.id + '/pdf' : ''); if (!target) throw new Error('Thêm tài liệu đã duyệt để mở PDF.'); await Linking.openURL(target); })} /> :
          <><Text style={styles.small}>{doc.type === 'sale' ? 'Trả trực tiếp khi nhận tài liệu.' : 'Điểm được giữ khi đặt hẹn và hoàn lại khi hủy trước khi giao.'}</Text><Button caption={doc.type === 'sale' ? 'Đặt lịch · ' + price(doc) : 'Giữ chỗ · ' + price(doc)} onPress={() => { setPlace(''); setTime(''); secured('appointment'); }} /><Button caption="Nhắn tin" alt onPress={() => startChat(doc.owner)} /></>}
        <Button caption={me?.saved.includes(doc.id) ? 'Bỏ lưu tài liệu' : 'Lưu tài liệu'} alt onPress={() => { if (!me) { open('login'); return; } void run(async () => {
          const { saved } = await api<{ saved: boolean }>('/documents/' + doc.id + '/save', 'POST', { saved: !me.saved.includes(doc.id) });
          setMe({ ...me, saved: saved ? [...me.saved, doc.id] : me.saved.filter(id => id !== doc.id) });
        }); }} />
        <Button caption="Báo cáo tài liệu" alt onPress={() => { setReason(''); setEvidence(''); secured('report'); }} />
      </>}
      {page === 'appointment' && <>
        {card(doc)}<Field label="Điểm hẹn" value={place} change={setPlace} /><Field label="Ngày và giờ hẹn" value={time} change={setTime} />
        <Button caption="Gửi yêu cầu đặt hẹn" onPress={() => void run(async () => { await api('/deals', 'POST', { doc: doc.id, location: place, time }); setDeals(await api<Deal[]>('/deals')); open('deals'); })} />
      </>}
      {page === 'deals' && (deals.length ? deals.map(deal => <View key={deal._id} style={styles.panel}>
        <Text style={styles.bold}>{deal.document?.title || 'Tài liệu'}</Text><Text>{status[deal.status]}</Text><Text style={styles.small}>{deal.location} · {deal.time}</Text>
        {deal.status === 'requested' && deal.seller === me?.id && <Button caption="Chấp nhận lịch" onPress={() => void act(deal._id, 'accept')} />}
        {['requested', 'scheduled'].includes(deal.status) && <Button caption={deal.type === 'points' ? 'Hủy và hoàn điểm' : 'Hủy lịch'} onPress={() => void act(deal._id, 'cancel')} alt />}
        {['scheduled', 'waiting'].includes(deal.status) && !!me && !deal.confirmations.includes(me.id) && <Button caption={deal.buyer === me.id ? 'Đã nhận tài liệu' : deal.type === 'sale' ? 'Đã giao và nhận tiền' : 'Đã giao tài liệu'} onPress={() => void act(deal._id, 'confirm')} />}
        {deal.status === 'completed' && <Button caption="Đánh giá" onPress={() => { setReviewDeal(deal._id); setRating(5); open('review'); }} alt />}
      </View>) : <Text>Chưa có giao dịch.</Text>)}
      {page === 'review' && <><View style={styles.wrap}>{[1, 2, 3, 4, 5].map(n => <Button key={n} caption={n + ' ★'} alt={rating !== n} onPress={() => setRating(n)} />)}</View><Field label="Nhận xét" value={message} change={setMessage} /><Button caption="Gửi đánh giá" onPress={() => void run(async () => { await api('/reviews', 'POST', { deal: reviewDeal, rating, text: message }); open('deals'); setNotice('Đã gửi đánh giá.'); })} /></>}
      {page === 'publish' && <>
        {form.cover && <Image source={{ uri: form.cover }} style={styles.picture} />}
        <Button caption="Chọn ảnh bìa" alt onPress={() => void run(async () => { const value = await pick(); if (value) formField('cover')(value); })} />
        {!!form.cover && <Button caption="Đọc ảnh bằng AI" onPress={() => void run(async () => {
          const result = await api<Partial<typeof blank>>('/ai/cover', 'POST', { cover: form.cover });
          setForm(old => ({ ...old, title: result.title || old.title, subject: result.subject || old.subject, category: result.category || old.category, description: result.description || old.description }));
        })} alt />}
        {([['title','Tên tài liệu'],['subject','Môn học'],['category','Danh mục'],['description','Mô tả']] as const).map(([key, label]) => <Field key={key} label={label} value={form[key]} change={formField(key)} />)}
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
        <View style={styles.hero}><Avatar user={me} /><Text style={styles.heading}>{me.name}</Text><Text>{me.school}</Text></View>
        <Button caption="Chỉnh sửa hồ sơ" alt onPress={() => { setProfileName(me.name); setAvatar(me.avatar || ''); open('edit'); }} />
        <Button caption="Tài liệu đã lưu" alt onPress={() => loadList('/documents/saved', 'saved')} />
        <Button caption="Bài đăng của tôi" alt onPress={() => loadList('/documents/mine', 'mine')} />
        <Button caption="Lịch sử giao dịch" alt onPress={showDeals} />
        <Button caption="Ví điểm" alt onPress={() => void run(async () => { setPoints(await api<typeof points>('/points')); open('wallet'); })} />
        <Button caption="Duyệt bài (quản trị)" alt onPress={() => loadList('/moderation', 'moderation')} />
        <Button caption="Đăng xuất" onPress={() => void run(async () => { await api('/auth/logout', 'POST'); await AsyncStorage.removeItem('edushare-session'); setMe(null); setToken(''); open('welcome'); })} />
      </>}
      {page === 'edit' && me && <><Avatar user={{ ...me, avatar }} /><Button caption="Thay ảnh đại diện" alt onPress={() => void run(async () => { const value = await pick(); if (value) setAvatar(value); })} /><Field label="Họ và tên" value={profileName} change={setProfileName} /><Button caption="Lưu thay đổi" onPress={() => void run(async () => { setMe(await api<User>('/me', 'PATCH', { name: profileName, avatar: avatar || undefined })); open('account'); })} /></>}
      {page === 'saved' && (list.length ? list.map(item => card(item)) : <Text>Chưa có tài liệu đã lưu.</Text>)}
      {(page === 'mine' || page === 'moderation') && (list.length ? list.map(item => <View key={item.id} style={styles.panel}>
        {card(item)}<Text>{status[item.status]}</Text>
        {page === 'mine' && item.status === 'revision' && <Button caption="Sửa và gửi lại" onPress={() => { setEditing(item.id); setType(item.type); setForm({ title: item.title, subject: item.subject, category: item.category, description: item.description, cover: item.cover || '', cost: String(item.price), fileUrl: item.fileUrl || '', fileName: item.fileName || '', pdf: '' }); open('publish'); }} />}
        {page === 'moderation' && <View style={styles.wrap}>{[true, false].map(approved => <Button key={String(approved)} caption={approved ? 'Duyệt bài' : 'Yêu cầu sửa'} alt={!approved} onPress={() => void run(async () => { await api('/moderation/' + item.id, 'POST', { approved }); setList(await api<Listing[]>('/moderation')); })} />)}</View>}
      </View>) : <Text>Chưa có bài đăng.</Text>)}
      {page === 'wallet' && <><View style={styles.hero}><Text style={styles.heading}>{points.balance} điểm khả dụng</Text></View>{points.entries.map(p => <View key={p._id} style={styles.panel}><Text style={styles.bold}>{p.amount > 0 ? '+' : ''}{p.amount} điểm</Text><Text>{p.reason}</Text></View>)}</>}
      {page === 'profile' && <><View style={styles.hero}><Avatar user={peer} /><Text style={styles.heading}>{peer.name}</Text><Text>{peer.school}</Text><Text>{reviewItems.length ? (reviewItems.reduce((sum, r) => sum + r.rating, 0) / reviewItems.length).toFixed(1) + ' ★' : 'Chưa có đánh giá'}</Text></View><Button caption="Nhắn tin" onPress={() => startChat(peer)} />{reviewItems.map(r => <View key={r._id} style={styles.panel}><Text style={styles.bold}>{r.rating} ★</Text><Text>{r.text}</Text></View>)}</>}
      {page === 'inbox' && (contacts.length ? contacts.map(user => <Pressable key={user.id} style={styles.card} onPress={() => startChat(user)}><Avatar user={user} /><Text style={styles.bold}>{user.name}</Text></Pressable>) : <Text>Bắt đầu trò chuyện từ trang chi tiết tài liệu.</Text>)}
      {page === 'chat' && <>
        <Pressable style={styles.card} onPress={() => showPeer(peer)}><Avatar user={peer} /><View><Text style={styles.bold}>{peer.name}</Text><Text style={styles.small}>{peer.school}</Text></View></Pressable>
        {messages.map(item => <View key={item._id} style={[styles.bubble, item.from === me?.id && styles.mine]}><Avatar user={me && item.from === me.id ? me : peer} /><Text style={styles.flex}>{item.text}</Text></View>)}
        <Field label="Nhập tin nhắn" value={message} change={setMessage} /><Button caption="Gửi tin nhắn" onPress={() => void run(async () => { const sent = await api<Message>('/chat/' + peer.id, 'POST', { text: message }); setMessage(''); setMessages(rows => rows.some(row => row._id === sent._id) ? rows : [...rows, sent]); })} />
      </>}
      {page === 'assistant' && <><View style={styles.banner}><Ionicons name="sparkles" color="#ffcf1a" size={32} /><Text style={styles.bannerTitle}>Hỏi về tài liệu EduShare</Text></View><Field label="Câu hỏi về tài liệu" value={message} change={setMessage} /><Button caption="Gửi câu hỏi" onPress={() => void run(async () => setAnswer((await api<{ answer: string }>('/ai/chat', 'POST', { question: message })).answer))} />{!!answer && <Text style={styles.panel}>{answer}</Text>}</>}
      {page === 'report' && <>{card(doc)}<Field label="Lý do báo cáo" value={reason} change={setReason} /><Field label="Mô tả" value={message} change={setMessage} />{evidence && <Image source={{ uri: evidence }} style={styles.picture} />}<Button caption={evidence ? 'Bỏ ảnh minh chứng' : 'Thêm ảnh minh chứng'} alt onPress={() => void run(async () => setEvidence(evidence ? '' : (await pick()) || ''))} /><Button caption="Gửi báo cáo" onPress={() => void run(async () => { await api('/reports', 'POST', { doc: doc.id, reason, description: message, image: evidence || undefined }); open('detail'); setNotice('Đã gửi báo cáo.'); })} /></>}
    </ScrollView>
    {['home', 'account', 'inbox', 'saved'].includes(page) && <View style={styles.nav}>
      <Nav icon="home-outline" label="Trang chủ" press={() => open('home')} />
      <Nav icon="bookmark-outline" label="Thư viện" press={() => me ? loadList('/documents/saved', 'saved') : open('login')} />
      <Nav icon="add-circle" label="Đăng" press={() => { setForm(blank); setEditing(''); setType('digital'); secured('publish'); }} />
      <Nav icon="chatbubble-outline" label="Chat" press={() => me ? void run(async () => { setContacts(await api<PublicUser[]>('/chat')); open('inbox'); }) : open('login')} />
      <Nav icon="person-outline" label="Hồ sơ" press={() => secured('account')} />
    </View>}
  </SafeAreaView>;

  async function act(id: string, action: string) {
    await run(async () => { await api('/deals/' + id + '/action', 'POST', { action }); setDeals(await api<Deal[]>('/deals')); });
  }
}
function Nav({ icon, label, press }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; press: () => void }) {
  return <Pressable accessibilityRole="button" onPress={press} style={styles.navItem}><Ionicons name={icon} size={21} color="#213347" /><Text style={styles.small}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
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
