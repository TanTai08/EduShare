import type { ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { Listing, PublicUser } from '../../../../../../packages/contracts';
import { Button, Avatar, Field } from '../../ui';
import { styles } from '../../styles';
import { WebButton } from '../../Workspace';
import { money, price, status, type Deal, type User } from '../../models';
import { AppointmentPicker } from './AppointmentPicker';
import type { Appointment } from '../../../../../../packages/contracts/appointment';

export function DealsScreen({ page, desktop, doc, listingCard, place, setPlace, appointment, setAppointment, onBook, dealFilter, setDealFilter, visibleDeals, deals,
  selectedDeal, onSelectDeal, showPeer, startChat, me, act, onReview, rating, setRating, message, setMessage, onReviewSubmit }: {
  page: 'appointment' | 'deals' | 'dealProgress' | 'review'; desktop: boolean; doc: Listing; listingCard: ReactNode;
  place: string; setPlace: (value: string) => void; appointment: Appointment | null; setAppointment: (value: Appointment) => void; onBook: () => void;
  dealFilter: string; setDealFilter: (value: string) => void; visibleDeals: Deal[]; deals: Deal[]; selectedDeal: string; onSelectDeal: (id: string) => void;
  showPeer: (user: PublicUser) => void; startChat: (user: PublicUser) => void; me: User | null;
  act: (id: string, action: string) => void; onReview: (id: string) => void; rating: number; setRating: (value: number) => void;
  message: string; setMessage: (value: string) => void; onReviewSubmit: () => void;
}) {

  if (page === 'appointment') return <>
    {listingCard}
    <Text style={styles.small}>{doc.type === 'sale' ? 'Trả ' + price(doc) + ' trực tiếp khi nhận tài liệu.' : 'Giữ ' + price(doc) + ' khi gửi yêu cầu. Hoàn điểm nếu hủy trước khi giao.'}</Text>
    <Field label="Điểm hẹn" value={place} change={setPlace} />
    <AppointmentPicker value={appointment} onChange={setAppointment} />
    <Button caption="Gửi yêu cầu đặt hẹn" onPress={onBook} />
  </>;
  if (page === 'deals') return <>
    {desktop && <View style={styles.wrap}>
    {[
      { key: '', label: 'Tất cả' }, { key: 'requested', label: 'Chờ xác nhận' }, { key: 'scheduled', label: 'Đã hẹn' },
      { key: 'completed', label: 'Hoàn tất' }, { key: 'cancelled', label: 'Đã hủy' },
    ].map(item => <WebButton key={item.key} title={item.label} primary={item.key === dealFilter} onPress={() => setDealFilter(item.key)} />)}
  </View>}
  {visibleDeals.length ? visibleDeals.map(deal => <Pressable accessibilityRole="button" key={deal._id} style={styles.panel} onPress={() => onSelectDeal(deal._id)}>
    {!!deal.document?.cover && desktop && <Image source={{ uri: deal.document.cover }} style={styles.dealCover} />}
    <Text style={styles.bold}>{deal.document?.title || 'Tài liệu'}</Text><Text style={styles.price}>{status[deal.status]}</Text><Text style={styles.small}>{deal.counterparty?.name} · {deal.location}</Text>
  </Pressable>) : <Text>Chưa có giao dịch.</Text>}
  </>;
  if (page === 'dealProgress') return deals.filter(deal => deal._id === selectedDeal).map(deal => <View key={deal._id} style={styles.dealLayout}>
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
    {deal.status === 'completed' && <Button caption="Đánh giá" onPress={() => onReview(deal._id)} alt />}
  </View>);
  return <><View style={styles.wrap}>{[1, 2, 3, 4, 5].map(n => <Button key={n} caption={n + ' ★'} alt={rating !== n} onPress={() => setRating(n)} />)}</View><Field label="Nhận xét" value={message} change={setMessage} /><Button caption="Gửi đánh giá" onPress={onReviewSubmit} /></>;
}
