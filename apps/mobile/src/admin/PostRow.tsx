import { Pressable,Text,View } from 'react-native';
import { type Post,date,dateTime,price } from './models';
import { Action,Avatar,Cover,Icon,Pill,s } from './ui';
import { layout } from './layout';

export function PostRow({ item, desktop, compact = false, selected = false, showStatus, onSelect, onOpen }: {
  item: Post; desktop: boolean; compact?: boolean; selected?: boolean; showStatus?: boolean; onSelect?: () => void; onOpen: () => void;
}) {
  const canSelect = !compact && item.status === 'pending';
  return <View key={item.id} style={[layout.tableRow, !desktop && layout.mobileRow]}>
    <View style={[s.row, { flex: desktop ? 2 : undefined, minWidth: 0 }]}>
      {canSelect && <Pressable accessibilityRole="checkbox" accessibilityLabel={'Chọn ' + item.title} accessibilityState={{ checked: selected }}
        onPress={onSelect}><Icon name={selected ? 'checkbox' : 'square-outline'} /></Pressable>}
      <Cover post={item} /><View style={s.flex}><Text style={s.bold}>{item.title}</Text><Text style={s.muted}>{desktop ? [item.category, item.subject].filter(Boolean).join(' · ') : (item.owner?.name || 'Người dùng') + ' · ' + date(item.submittedAt || item.createdAt)}</Text></View>
    </View>
    {desktop && <View style={[s.row, s.flex]}><Avatar person={item.owner} /><View style={s.flex}>
      <Text numberOfLines={1} style={s.bold}>{item.owner?.name || 'Người dùng'}</Text><Text numberOfLines={1} style={s.muted}>{item.owner?.school}</Text></View></View>}
    <View style={desktop ? s.flex : s.between}><Text style={s.bold}>{price(item)}</Text>{!desktop && <Pill value={item.status} />}</View>
    {desktop && <View style={s.flex}>{compact ? <Pill value={item.status} /> : <><Text style={s.muted}>{dateTime(item.submittedAt || item.createdAt)}</Text>{showStatus && <Pill value={item.status} />}</>}</View>}
    <View style={desktop ? s.flex : { alignSelf: 'flex-start' }}><Action kind="text" label={item.status === 'pending' ? 'Xem duyệt →' : 'Chi tiết →'} onPress={onOpen} /></View>
  </View>;
}
