import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listingLabels, type ListingType } from '../../../../packages/contracts';
import { Button, Field } from './ui';
import { styles } from './styles';
import { money, type blank } from './models';

export function PublishScreen({ page, desktop, form, aiFields, type, formField, chooseType, onCover, onReadCover, onPickPdf, onPdfUrl,
  onPreview, onSubmit, onEdit, onMine }: {
  page: 'publish' | 'preview' | 'posted'; desktop: boolean; form: typeof blank; aiFields: string[]; type: ListingType;
  formField: (key: keyof typeof blank) => (value: string) => void; chooseType: (type: ListingType) => void;
  onCover: () => void; onReadCover: () => void; onPickPdf: () => void; onPdfUrl: (value: string) => void;
  onPreview: () => void; onSubmit: () => void; onEdit: () => void; onMine: () => void;
}) {
  const coverFields = page === 'publish' && <>
    {form.cover && <View style={styles.aiBanner}><Image source={{ uri: form.cover }} style={styles.aiCover} /><View style={styles.flex}><Text style={styles.bold}>{aiFields.length ? 'Đã đọc xong ảnh bìa' : 'Ảnh bìa tài liệu'}</Text><Text style={styles.small}>{aiFields.length ? 'Bạn có thể sửa các ô đã được AI điền.' : 'Dùng AI để gợi ý thông tin.'}</Text></View></View>}
    <Button caption="Chọn ảnh bìa" alt onPress={onCover} />
    {!!form.cover && <Button caption="Đọc ảnh bằng AI" onPress={onReadCover} alt />}
  </>;
  const fileFields = page === 'publish' && type === 'digital' && <>
    <Button caption={form.fileName || 'Chọn tệp PDF (tối đa 3 MB)'} alt onPress={onPickPdf} />
    <Field label="Hoặc liên kết HTTPS đến PDF" value={form.fileUrl} change={onPdfUrl} />
  </>;

  if (page === 'publish') return <View style={desktop ? styles.webSplit : styles.detailStack}>
    <View style={[styles.detailStack, desktop && styles.webSecondary]}>
      {desktop && <Text accessibilityRole="header" style={styles.heading}>Ảnh bìa tài liệu</Text>}
      {coverFields}
    </View>
    <View style={[styles.detailStack, desktop && styles.webPrimary]}>
      {desktop && <Text accessibilityRole="header" style={styles.heading}>Thông tin tài liệu</Text>}
      {([['title','Tên tài liệu'],['subject','Môn học'],['category','Danh mục'],['description','Mô tả']] as const).map(([key, label]) =>
        <Field key={key} label={aiFields.includes(key) ? label + ' · AI' : label} value={form[key]} change={formField(key)} />)}
      <View style={styles.wrap}>{(Object.keys(listingLabels) as ListingType[]).map(value => <Button key={value} caption={listingLabels[value]} onPress={() => chooseType(value)} alt={value !== type} />)}</View>
      {type === 'digital' ? fileFields : <Field label={type === 'sale' ? 'Giá bán (VNĐ)' : 'Điểm cần dùng'} value={form.cost} change={formField('cost')} />}
      <Button caption="Xem trước" onPress={onPreview} />
    </View>
  </View>;
  if (page === 'preview') return <>{form.cover && <Image source={{ uri: form.cover }} style={styles.picture} />}<Text style={styles.heading}>{form.title}</Text><Text>{form.subject} · {form.category}</Text><Text>{form.description}</Text><Text style={styles.price}>{type === 'sale' ? money(Number(form.cost)) + ' · Trả trực tiếp' : type === 'points' ? form.cost + ' điểm' : 'Miễn phí'}</Text><Button caption="Gửi bài để duyệt" onPress={onSubmit} /><Button caption="Chỉnh sửa" alt onPress={onEdit} /></>;
  return <View style={styles.hero}><Ionicons name="checkmark-circle" size={50} color="#287248" /><Text style={styles.heading}>Tài liệu đang chờ duyệt</Text><Button caption="Bài đăng của tôi" onPress={onMine} /></View>;
}
