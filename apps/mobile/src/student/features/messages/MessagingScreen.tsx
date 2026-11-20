import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Listing, PublicUser } from '../../../../../../packages/contracts';
import { Avatar, Cover, Field } from '../../ui';
import { styles } from '../../styles';
import { WebButton } from '../../Workspace';
import { price, type Deal, type Message, type User } from '../../models';

export function MessagingScreen({ page, desktop, contactQuery, setContactQuery, visibleContacts, startChat, showPeer, peer, chatDocument,
  onOpen, relatedDeal, onDeal, messages, me, message, setMessage, busy, onSend }: {
  page: 'inbox' | 'chat'; desktop: boolean; contactQuery: string; setContactQuery: (value: string) => void; visibleContacts: PublicUser[];
  startChat: (user: PublicUser) => void; showPeer: (user: PublicUser) => void; peer: PublicUser; chatDocument: Listing | null;
  onOpen: (doc: Listing) => void; relatedDeal?: Deal; onDeal: (id: string) => void; messages: Message[]; me: User | null;
  message: string; setMessage: (value: string) => void; busy: boolean; onSend: () => void;
}) {
  if (page === 'inbox') return <>
    {desktop && <Field label="Tìm cuộc trò chuyện" value={contactQuery} change={setContactQuery} />}
  {visibleContacts.length ? visibleContacts.map(user => <Pressable key={user.id} accessibilityRole="button" accessibilityLabel={user.name} style={styles.card} onPress={() => startChat(user)}><Avatar user={user} /><Text style={styles.bold}>{user.name}</Text></Pressable>) : <Text>Bắt đầu trò chuyện từ trang chi tiết tài liệu.</Text>}
  </>;
  return <>
    <Pressable style={styles.card} onPress={() => showPeer(peer)}><Avatar user={peer} /><View><Text style={styles.bold}>{peer.name}</Text><Text style={styles.small}>{peer.school}</Text></View></Pressable>
    {chatDocument && <Pressable accessibilityRole="button" style={styles.aiBanner} onPress={() => onOpen(chatDocument)}>
      <Cover doc={chatDocument} /><View style={styles.flex}><Text style={styles.bold}>{chatDocument.title}</Text><Text style={styles.small}>{price(chatDocument)} · {chatDocument.type === 'sale' ? 'Trả trực tiếp khi nhận' : chatDocument.type === 'points' ? 'Nhận trực tiếp' : 'PDF online'}</Text></View>
    </Pressable>}
    {relatedDeal && <View style={styles.detailPanel}><Text style={styles.bold}>Lịch giao nhận · {relatedDeal.time}</Text><Text style={styles.small}>{relatedDeal.location}</Text>
      <WebButton title="Xem giao dịch" onPress={() => onDeal(relatedDeal._id)} /></View>}
    {messages.map(item => <View key={item._id} style={[styles.bubble, item.from === me?.id && styles.mine]}><Avatar user={me && item.from === me.id ? me : peer} /><Text style={styles.flex}>{item.text}</Text></View>)}
    <View style={styles.composer}><TextInput accessibilityLabel="Nhập tin nhắn" placeholder="Nhập tin nhắn…" style={styles.searchInput} value={message} onChangeText={setMessage} /><Pressable accessibilityRole="button" accessibilityLabel="Gửi tin nhắn" disabled={busy || !message.trim()} style={styles.send} onPress={onSend}><Ionicons name="send-outline" size={18} color="#171815" /></Pressable></View>
  </>;
}
