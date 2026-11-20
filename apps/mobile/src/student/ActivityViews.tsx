import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Listing, PublicUser } from '../../../../packages/contracts';
import { WebButton, palette, panel, column } from './Workspace';
import { cost, fold } from './LibraryHome';

export type Deal = {
  _id: string; buyer: string; seller: string; type: string; price: number; time: string; location: string; status: string;
  confirmations: string[]; counterparty?: PublicUser; document?: { title: string; cover?: string };
};
export type Message = { _id: string; from: string; text: string };
const states: Record<string, string> = { requested: 'Chờ xác nhận', scheduled: 'Đã hẹn', waiting: 'Chờ xác nhận giao nhận', completed: 'Hoàn tất', cancelled: 'Đã hủy' };
const filters = [
  { key: '', label: 'Tất cả' }, { key: 'requested', label: 'Chờ xác nhận' }, { key: 'scheduled', label: 'Đã hẹn' },
  { key: 'completed', label: 'Hoàn tất' }, { key: 'cancelled', label: 'Đã hủy' },
];
const dealCost = (deal: Deal) => deal.price.toLocaleString('vi-VN') + (deal.type === 'sale' ? ' ₫' : ' điểm');
function PersonImage({ user }: { user: PublicUser }) {
  return user.avatar ? <Image source={{ uri: user.avatar }} style={s.avatar} /> :
    <View style={s.avatar}><Text style={s.bold}>{user.name?.trim()[0]?.toUpperCase() || '?'}</Text></View>;
}

export function WebDeals({ deals, selected, choose, userId, busy, onAction, onChat, onProfile, onReview }: {
  deals: Deal[]; selected: string; choose: (id: string) => void; userId?: string; busy: boolean;
  onAction: (id: string, action: string) => void; onChat: (user: PublicUser) => void;
  onProfile: (user: PublicUser) => void; onReview: (id: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const visible = deals.filter(deal => !filter || deal.status === filter || (filter === 'scheduled' && deal.status === 'waiting'));
  const explicit = deals.find(deal => deal._id === selected);
  const current = visible.find(deal => deal._id === selected) ?? visible[0];
  const activeStage = !current || current.status === 'requested' ? 0 : current.status === 'scheduled' ? 1 : 2;
  useEffect(() => {
    if (explicit && filter && explicit.status !== filter && !(filter === 'scheduled' && explicit.status === 'waiting')) setFilter('');
  }, [explicit?.status, selected]);
  return <>
    <View style={s.wrap}>{filters.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label}
      accessibilityState={{ selected: filter === item.key }} style={[s.tab, filter === item.key && s.selectedTab]}
      onPress={() => { setFilter(item.key); choose(''); }}><Text style={s.bold}>{item.label}</Text></Pressable>)}</View>
    <View style={s.columns}>
      <View style={[column, { width: '29%' }]}>
        {visible.map(deal => <Pressable key={deal._id} accessibilityRole="button" accessibilityLabel={deal.document?.title || 'Giao dịch'} accessibilityState={{ selected: current?._id === deal._id }}
          onPress={() => choose(deal._id)} style={[panel, current?._id === deal._id && s.highlight]}>
          <Text style={s.caption}>BẢN IN · NHẬN TẠI TRƯỜNG</Text>
          <View style={s.row}>
            {!!deal.document?.cover && <Image source={{ uri: deal.document.cover }} style={s.dealImage} />}
            <View style={s.flex}><Text style={s.heading}>{deal.document?.title || 'Tài liệu'}</Text><Text style={s.muted}>{deal.counterparty?.name}</Text></View>
          </View>
          <View style={s.between}><Text style={s.bold}>{states[deal.status]} · {dealCost(deal)}</Text><Ionicons name="arrow-forward" size={18} color={palette.ink} /></View>
        </Pressable>)}
        <View style={[panel, s.blue]}><Text style={s.heading}>An tâm trao đổi tài liệu</Text><Text style={s.muted}>Chỉ xác nhận đã nhận sau khi kiểm tra tài liệu và hoàn tất giao nhận tại điểm hẹn.</Text></View>
      </View>
      {current ? <View style={[panel, s.flex, { gap: 20 }]}>
        <View style={s.between}><Text accessibilityRole="header" style={s.section}>Tiến trình giao dịch</Text><Text style={s.badge}>{states[current.status]}</Text></View>
        <Text style={s.section}>{current.document?.title || 'Tài liệu'}</Text>
        {!!current.counterparty && <Pressable accessibilityRole="button" onPress={() => onProfile(current.counterparty!)} style={s.row}>
          <PersonImage user={current.counterparty} /><Text style={[s.muted, s.flex]}>{current.counterparty.name} · {current.counterparty.school}</Text>
        </Pressable>}
        <View style={s.metrics}>{[
          { label: 'THỜI GIAN', value: current.time }, { label: 'ĐIỂM HẸN', value: current.location },
          { label: current.type === 'sale' ? 'TRẢ KHI NHẬN' : 'ĐIỂM', value: dealCost(current) },
        ].map(item => <View key={item.label} style={s.flex}><Text style={s.caption}>{item.label}</Text><Text style={s.bold}>{item.value}</Text></View>)}</View>
        {current.status !== 'cancelled' && ['Đặt hẹn', 'Giao nhận', 'Hoàn tất'].map((label, i) => {
          const complete = i < activeStage || current.status === 'completed';
          return <View key={label} style={s.row}><View style={[s.step, complete ? s.green : i === activeStage && s.selectedTab]}>
            <Text style={s.bold}>{complete ? '✓' : i + 1}</Text></View>
            <View style={s.flex}><Text style={s.heading}>{label}</Text><Text style={s.muted}>{[
              'Hai bên thống nhất thời gian và địa điểm.', current.type === 'sale' ? 'Kiểm tra tài liệu và trả trực tiếp tại điểm hẹn.' : 'Giao nhận tài liệu tại điểm hẹn.',
              'Hai bên xác nhận để hoàn tất giao dịch.',
            ][i]}</Text></View>
          </View>;
        })}
        <View style={s.wrap}>
          {current.status === 'requested' && current.seller === userId && <WebButton title="Chấp nhận lịch" primary disabled={busy} onPress={() => onAction(current._id, 'accept')} />}
          {userId && ['scheduled', 'waiting'].includes(current.status) && !current.confirmations.includes(userId) &&
            <WebButton title={current.buyer === userId ? 'Xác nhận đã nhận' : 'Xác nhận đã giao'} primary disabled={busy} onPress={() => onAction(current._id, 'confirm')} />}
          {current.counterparty && ['requested', 'scheduled', 'waiting'].includes(current.status) && <WebButton title="Nhắn tin" onPress={() => onChat(current.counterparty!)} />}
          {['requested', 'scheduled'].includes(current.status) && <WebButton title={current.type === 'points' ? 'Hủy và hoàn điểm' : 'Hủy lịch'} disabled={busy} onPress={() => onAction(current._id, 'cancel')} />}
          {current.status === 'completed' && <WebButton title="Đánh giá" onPress={() => onReview(current._id)} />}
        </View>
      </View> : <View style={[panel, s.flex]}><Text style={s.heading}>Chưa có giao dịch trong mục này.</Text></View>}
    </View>
  </>;
}

export function WebMessages({ contacts, peer, doc, messages, deals, userId, draft, busy, select, change, send, profile, detail, openDeal }: {
  contacts: PublicUser[]; peer?: PublicUser; doc: Listing | null; messages: Message[]; deals: Deal[]; userId?: string;
  draft: string; busy: boolean; select: (user: PublicUser) => void; change: (value: string) => void;
  send: () => void; profile: (user: PublicUser) => void; detail: (doc: Listing) => void; openDeal: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const list = useRef<ScrollView>(null);
  const available = peer && !contacts.some(user => user.id === peer.id) ? [peer, ...contacts] : contacts;
  const matching = available.filter(user => fold(user.name).includes(fold(q.trim())));
  const appointment = peer && deals.find(deal => deal.counterparty?.id === peer.id && ['requested', 'scheduled', 'waiting'].includes(deal.status));
  return <View style={s.columns}>
    <View style={[panel, s.inbox]}>
      <Text accessibilityRole="header" style={s.section}>Hộp thư</Text>
      <TextInput accessibilityLabel="Tìm cuộc trò chuyện" placeholder="Tìm cuộc trò chuyện…" placeholderTextColor={palette.muted} value={q} onChangeText={setQ} style={s.input} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={column}>
        {matching.map(user => <Pressable key={user.id} accessibilityRole="button" accessibilityLabel={user.name} accessibilityState={{ selected: user.id === peer?.id }}
          onPress={() => select(user)} style={[s.contact, user.id === peer?.id && s.highlight]}>
          <PersonImage user={user} /><View style={s.flex}><Text style={s.bold}>{user.name}</Text><Text style={s.muted} numberOfLines={2}>{user.school}</Text></View>
        </Pressable>)}
        {!matching.length && <Text style={s.muted}>{q.trim() ? 'Không tìm thấy cuộc trò chuyện.' : 'Bạn chưa có cuộc trò chuyện nào.'}</Text>}
      </ScrollView>
    </View>
    <View style={[panel, s.transcript, s.flex]}>
      {peer ? <>
        <View style={s.conversationHeading}><Text accessibilityRole="header" style={s.section}>{peer.name}</Text><Text style={s.muted}>{peer.school}</Text></View>
        {doc && <Pressable accessibilityRole="button" onPress={() => detail(doc)} style={s.context}><Text style={s.bold}>{doc.title}</Text><Text style={s.muted}>{cost(doc)}</Text></Pressable>}
        <ScrollView ref={list} onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })} contentContainerStyle={s.messages}>
          {messages.map(message => <View key={message._id} style={[s.bubble, message.from === userId && s.mine]}><Text style={s.messageText}>{message.text}</Text></View>)}
          {!messages.length && <Text style={s.muted}>Gửi tin nhắn để bắt đầu trò chuyện.</Text>}
        </ScrollView>
        <View style={s.compose}><TextInput accessibilityLabel="Nhập tin nhắn" placeholder="Nhập tin nhắn…" placeholderTextColor={palette.muted}
          value={draft} onChangeText={change} onSubmitEditing={send} style={[s.input, s.flex]} />
          <WebButton title="Gửi" icon="arrow-forward" primary disabled={busy || !draft.trim()} onPress={send} /></View>
      </> : <View style={s.conversationHeading}><Text style={s.heading}>Chọn một cuộc trò chuyện</Text><Text style={s.muted}>Bạn cũng có thể nhắn tin từ trang chi tiết một tài liệu.</Text></View>}
    </View>
    {peer && <View style={[column, { width: '20%' }]}>
      <View style={panel}><PersonImage user={peer} /><Text style={s.heading}>{peer.name}</Text><Text style={s.muted}>{peer.school}</Text>
        <WebButton title="Xem hồ sơ" onPress={() => profile(peer)} /></View>
      {appointment && <View style={[panel, s.highlight]}><Text style={s.heading}>Hẹn nhận tài liệu</Text><Text style={s.bold}>{appointment.time}</Text>
        <Text style={s.muted}>{appointment.location}</Text><WebButton title="Xem giao dịch" onPress={() => openDeal(appointment._id)} /></View>}
    </View>}
  </View>;
}

const s = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tab: { backgroundColor: '#fff', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8 },
  selectedTab: { backgroundColor: palette.yellow },
  highlight: { backgroundColor: palette.pale },
  blue: { backgroundColor: '#e8eefc' },
  green: { backgroundColor: '#e1f2ed' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  section: { fontSize: 21, fontWeight: '800', color: palette.ink },
  heading: { fontSize: 16, fontWeight: '800', color: palette.ink },
  bold: { fontSize: 14, fontWeight: '700', color: palette.ink },
  caption: { fontSize: 10, color: palette.muted, marginBottom: 3 },
  muted: { fontSize: 13, color: palette.muted, lineHeight: 19 },
  badge: { fontSize: 12, color: palette.ink, backgroundColor: palette.pale, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  metrics: { flexDirection: 'row', gap: 16, padding: 18, borderRadius: 12, backgroundColor: '#f4f6f8' },
  step: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.soft, alignItems: 'center', justifyContent: 'center' },
  dealImage: { width: 42, height: 51, borderRadius: 6 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6ecf6' },
  inbox: { width: '22%', height: 640, padding: 18 },
  input: { minHeight: 42, minWidth: 0, backgroundColor: palette.soft, paddingHorizontal: 12, borderRadius: 8, fontSize: 13, color: palette.ink },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f4f6f8', borderRadius: 9, padding: 10 },
  transcript: { height: 640, padding: 0, gap: 0, overflow: 'hidden' },
  conversationHeading: { padding: 20, gap: 4 },
  context: { backgroundColor: '#f4f6f8', padding: 18, gap: 4 },
  messages: { padding: 20, gap: 13 },
  bubble: { maxWidth: '88%', alignSelf: 'flex-start', backgroundColor: palette.soft, padding: 14, borderRadius: 12 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#fff0ab' },
  messageText: { color: palette.ink, fontSize: 14, lineHeight: 19 },
  compose: { flexDirection: 'row', gap: 10, padding: 17 },
});
