import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Listing, PublicUser } from '../../../../../../packages/contracts';
import { Avatar, Button, Cover } from '../../ui';
import { styles } from '../../styles';
import { price } from '../../models';

export function DocumentScreen({ page, desktop, doc, saved, onOpenPdf, onBook, onChat, onSave, onReport, onProfile, onBackToDetail, onHome }: {
  page: 'detail' | 'pdfOpened'; desktop: boolean; doc: Listing; saved: boolean;
  onOpenPdf: () => void; onBook: () => void; onChat: (owner: PublicUser, doc: Listing) => void;
  onSave: () => void; onReport: () => void; onProfile: (owner: PublicUser) => void; onBackToDetail: () => void; onHome: () => void;
}) {
  const seller = <>
    <View style={styles.detailPanel}>
      <Text style={styles.bold}>{price(doc)}</Text>
      <Text style={styles.small}>{doc.fulfilled ? 'Giao nhận đã hoàn tất.' : doc.type === 'sale' ? 'Trả trực tiếp khi nhận' : doc.type === 'points' ? 'Giữ điểm khi đặt hẹn' : 'Xem và tải miễn phí'}</Text>
    </View>
    {doc.owner && <Pressable accessibilityRole="button" accessibilityLabel={'Xem hồ sơ ' + doc.owner.name} style={styles.card} onPress={() => onProfile(doc.owner)}>
      <Avatar user={doc.owner} />
      <View style={styles.flex}><Text style={styles.bold}>{doc.owner.name}</Text><Text style={styles.small}>{doc.owner.school}</Text></View>
      <Ionicons name="chevron-forward" size={18} />
    </Pressable>}
  </>;

  if (page === 'detail') return <View style={desktop ? styles.webSplit : styles.detailStack}>
      <View style={[styles.detailStack, desktop && styles.webPrimary]}>
        <Cover doc={doc} hero desktop={desktop} />
        <Text accessibilityRole={desktop ? 'header' : undefined} style={styles.detailTitle}>{doc.title}</Text>
        <Text style={styles.small}>{doc.type === 'digital' ? 'Tài liệu số · PDF online' : 'Bản in' + (doc.owner?.region ? ' · Nhận tại ' + doc.owner.region : '')}</Text>
        {!desktop && seller}
        <View style={styles.detailPanel}><Text style={styles.bold}>Nội dung tài liệu</Text><Text style={styles.body}>{doc.description}</Text></View>
      </View>
      <View style={[styles.detailStack, desktop && styles.webSecondary]}>
        {desktop && seller}
        {doc.type === 'digital' ? <Button caption="Mở PDF miễn phí" onPress={onOpenPdf} /> :
          doc.owner && <View style={styles.splitActions}><Button caption="Nhắn tin" alt fill onPress={() => onChat(doc.owner, doc)} />{!doc.fulfilled && <Button fill caption={doc.type === 'sale' ? 'Đặt lịch · ' + price(doc) : 'Giữ chỗ · ' + price(doc)} onPress={onBook} />}</View>}
        <Button caption={saved ? 'Bỏ lưu tài liệu' : 'Lưu tài liệu'} alt onPress={onSave} />
        <Button caption="Báo cáo tài liệu" alt onPress={onReport} />
      </View>
    </View>;
  return <>
    <View style={styles.hero}><Ionicons name="document-text-outline" size={44} color="#203448" /><Text style={styles.heading}>{doc.title}</Text><Text style={styles.small}>Tệp được mở bằng trình xem PDF của thiết bị.</Text></View>
    <Button caption="Về chi tiết tài liệu" onPress={onBackToDetail} />
    <Button caption="Tiếp tục khám phá" onPress={onHome} alt />
  </>;
}
