import { StyleSheet, Text, View } from 'react-native';
import type { Listing } from '../../../../packages/contracts';
import { palette, panel, column, WebButton } from './Workspace';
import { WebCover, cost } from './LibraryHome';

export function WebDocument({ doc, saved, onBrowse, onOpenPdf, onBook, onChat, onSave, onProfile, onReport }: {
  doc: Listing; saved: boolean; onBrowse: () => void; onOpenPdf: () => void; onBook: () => void;
  onChat: () => void; onSave: () => void; onProfile: () => void; onReport: () => void;
}) {
  const digital = doc.type === 'digital';
  return <>
    <View style={s.row}>
      <WebButton title="Khám phá" onPress={onBrowse} /><Text style={s.muted}>/  {doc.category}  /  {doc.title}</Text>
    </View>
    <View style={s.columns}>
      <View style={[column, { flex: 2.5 }]}>
        <View style={[panel, s.summary]}>
          <View style={s.cover}><WebCover item={doc} size="large" /></View>
          <View style={[column, { flex: 1 }]}>
            <Text style={s.caption}>{doc.category.toLocaleUpperCase('vi')} · {digital ? 'PDF ONLINE' : 'BẢN IN'}</Text>
            <Text accessibilityRole="header" aria-level={1} style={s.title}>{doc.title}</Text>
            <Text style={s.muted}>{doc.subject}{digital ? ' · Tài liệu số' : ' · Nhận tại ' + (doc.owner?.region || 'trường')}</Text>
            <View style={s.row}><Text style={s.tag}>{digital ? 'PDF online' : 'Nhận trực tiếp'}</Text>
              <Text style={s.tag}>{digital ? 'Miễn phí' : doc.type === 'sale' ? 'Tài liệu trả phí' : 'Nhận bằng điểm'}</Text></View>
          </View>
        </View>
        <View style={panel}><Text accessibilityRole="header" style={s.heading}>Nội dung tài liệu</Text><Text style={s.body}>{doc.description}</Text></View>
      </View>
      <View style={[column, { flex: 1 }]}>
        <View style={[panel, { gap: 16 }]}>
          <Text style={s.muted}>{digital ? 'Hình thức truy cập' : doc.type === 'sale' ? 'Giá tài liệu' : 'Điểm cần dùng'}</Text>
          <Text style={s.amount}>{cost(doc)}</Text>
          <Text style={s.muted}>{digital ? 'Xem và tải PDF miễn phí' : doc.type === 'sale' ? 'Trả trực tiếp khi nhận' : 'Giữ điểm khi đặt hẹn'}</Text>
          {digital ? <WebButton title="Mở PDF miễn phí" primary onPress={onOpenPdf} /> : !!doc.owner && <>
            <WebButton title={doc.type === 'sale' ? 'Đặt lịch mua' : 'Giữ chỗ nhận tài liệu'} primary onPress={onBook} />
            <WebButton title="Nhắn tin cho người đăng" onPress={onChat} />
          </>}
          <WebButton title={saved ? 'Bỏ lưu tài liệu' : 'Lưu tài liệu'} onPress={onSave} />
        </View>
        {doc.owner && <View style={panel}>
          <Text style={s.muted}>Người chia sẻ</Text><Text style={s.heading}>{doc.owner.name}</Text><Text style={s.muted}>{doc.owner.school}</Text>
          <View style={s.start}><WebButton title="Xem hồ sơ" icon="arrow-forward" onPress={onProfile} /></View>
        </View>}
        {!digital && <View style={[panel, { backgroundColor: palette.pale }]}><Text style={s.heading}>Giao dịch tại trường</Text>
          <Text style={s.body}>{doc.type === 'sale' ? 'Kiểm tra tài liệu và thanh toán tại điểm hẹn.' : 'Kiểm tra tài liệu trước khi xác nhận giao nhận.'} Chỉ xác nhận sau khi giao nhận hoàn tất.</Text></View>}
        <View style={s.start}><WebButton title="Báo cáo tài liệu" onPress={onReport} /></View>
      </View>
    </View>
  </>;
}

const s = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  summary: { flexDirection: 'row', alignItems: 'flex-start', gap: 22 },
  cover: { width: '29%', minWidth: 125, minHeight: 210, backgroundColor: '#e8eef8', borderRadius: 11, justifyContent: 'center', alignItems: 'center', padding: 12 },
  caption: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  title: { color: palette.ink, fontSize: 30, fontWeight: '800' },
  heading: { color: palette.ink, fontSize: 20, fontWeight: '800' },
  amount: { color: palette.ink, fontSize: 32, fontWeight: '800' },
  body: { color: palette.ink, fontSize: 14, lineHeight: 21 },
  muted: { color: palette.muted, fontSize: 13 },
  tag: { backgroundColor: palette.soft, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5, fontSize: 12, color: palette.ink },
  start: { alignSelf: 'flex-start' },
});
