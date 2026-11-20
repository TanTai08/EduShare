import type { ReactNode } from 'react';
import { Pressable,Text,View } from 'react-native';
import { type AccountDetail,type Member,type Overview,type Page,date,labels,number,shortId } from './models';
import { Action,Avatar,Choices,Empty,Field,MetricGrid,Pagination,Panel,Pill,Search,s } from './ui';
import { layout } from './layout';
import { headings } from './navigation';
import { heading,keyValue,options,renderResult,tableHead,type Resource } from './screenParts';

const accountFilters = ['', 'active', 'restricted', 'locked'];

export function UsersScreen({ desktop, columns, overview, query, search, userStatus, onStatus, showFilters, toggleFilters, ascending, toggleOrder,
  role, onRole, users, userId, select, details, onDetailLayout, close, newMember, page, limit, pageTo, update }: {
  desktop: boolean; columns: boolean; overview?: Overview; query: string; search: (value: string) => void; userStatus: string; onStatus: (key: string) => void;
  showFilters: boolean; toggleFilters: () => void; ascending: boolean; toggleOrder: () => void; role: string; onRole: (key: string) => void;
  users: Resource<Page<Member>>; userId: string; select: (id: string) => void; details: ReactNode; onDetailLayout: (y: number) => void; close: () => void;
  newMember: () => void; page: number; limit: number; pageTo: (next: number) => void; update: () => void;
}) {
  const result = <T,>(resource: Resource<T>, render: (value: T) => ReactNode) => renderResult(resource, render, update);
  return <>
    {heading('Người dùng', overview ? number(overview.users) + ' thành viên trong cộng đồng' : headings.users.subtitle,
      <Action label="Thêm thành viên" icon="add" kind="strong" onPress={newMember} />)}
    {overview && <MetricGrid wide={desktop} items={[
      { title: 'Tổng người dùng', value: overview.users }, { title: 'Đang hoạt động', value: overview.active },
      { title: 'Đang hạn chế', value: overview.restricted }, { title: 'Đã khóa', value: overview.locked },
    ]} />}
    <View style={[layout.split, columns && layout.splitRow]}>
      <View style={columns && { flex: 2 }}><Panel title="Danh sách người dùng">
        <Search value={query} onChange={search} placeholder="Tìm tên, email hoặc mã người dùng…" />
        <Choices options={options(accountFilters)} selected={userStatus} choose={onStatus} />
        <View style={s.wrap}><Action label="Vai trò" icon="options-outline" onPress={toggleFilters} />
          <Action label={ascending ? 'Cũ nhất ↑' : 'Mới nhất ↓'} onPress={toggleOrder} /></View>
        {showFilters && <Choices options={options(['', 'student', 'admin'])} selected={role} choose={onRole} />}
        {result(users, value => <>
          {desktop && !!value.rows.length && tableHead(['THÀNH VIÊN', 'VAI TRÒ', 'TRẠNG THÁI', 'THAM GIA'])}
          {value.rows.length ? value.rows.map(item => <Pressable accessibilityRole="button" key={item.id} onPress={() => select(item.id)}
            style={[layout.tableRow, !desktop && layout.mobileRow, item.id === userId && layout.selected]}>
            <View style={[s.row, { flex: desktop ? 2 : undefined, minWidth: 0 }]}><Avatar person={item} /><View style={s.flex}>
              <Text style={s.bold}>{item.name}</Text><Text style={s.muted} numberOfLines={1}>{item.email}</Text></View>{!desktop && <Pill value={item.status} />}</View>
            {desktop ? <><Text style={[s.muted, s.flex]}>{labels[item.role]}</Text><View style={s.flex}><Pill value={item.status} /></View>
              <Text style={[s.muted, s.flex]}>{date(item.createdAt)}</Text></> : <Text style={s.muted}>Chi tiết  →</Text>}
          </Pressable>) : <Empty label="Không tìm thấy người dùng." />}
          <Pagination page={page} limit={limit} total={value.total} go={pageTo} />
        </>)}
      </Panel></View>
      {columns && <View style={s.flex}>{details || <Panel title="Hồ sơ thành viên"><Empty label="Chọn một người dùng để xem hồ sơ." /></Panel>}</View>}
    </View>
    {!columns && !!userId && <View onLayout={event => onDetailLayout(event.nativeEvent.layout.y)}>
      <Action label="Đóng hồ sơ" icon="close" onPress={close} />
      {details}
    </View>}

  </>;
}

export function UserDetail({ item, note, setNote, busy, setProfileId, statusChange }: {
  item: AccountDetail; note: string; setNote: (note: string) => void; busy: boolean;
  setProfileId: (id: string) => void; statusChange: (status: string) => void;
}) {
  return <Panel title="Hồ sơ thành viên">
    <View style={layout.memberIdentity}><Avatar person={item} size={64} /><Text style={s.h2}>{item.name}</Text>
      <Text style={s.muted}>{shortId(item.id, 'ND')} · {item.school || 'Chưa có trường'}</Text><View><Pill value={item.status} /></View></View>
    {keyValue('Email', item.email)}{keyValue('Vai trò', labels[item.role])}{keyValue('Khu vực', item.region)}
    <View style={layout.memberStats}>
      <View><Text style={s.h2}>{number(item.posts)}</Text><Text style={s.muted}>Bài đăng</Text></View>
      <View><Text style={s.h2}>{number(item.deals)}</Text><Text style={s.muted}>Giao dịch</Text></View>
      <View><Text style={s.h2}>{item.rating == null ? '—' : number(Math.round(item.rating * 10) / 10)}</Text><Text style={s.muted}>Đánh giá</Text></View>
    </View>
    <Action label="Xem hồ sơ công khai ↗" onPress={() => setProfileId(item.id)} />
    {item.role !== 'admin' && <>
      <Field label="Lý do thay đổi trạng thái" value={note} onChange={setNote} multiline />
      <View style={s.wrap}>
        {item.status !== 'active' && <Action label="Khôi phục" disabled={busy || !note.trim()} onPress={() => statusChange('active')} />}
        {item.status === 'active' && <Action label="Hạn chế tài khoản" disabled={busy || !note.trim()} onPress={() => statusChange('restricted')} />}
        {item.status !== 'locked' && <Action label="Khóa tài khoản" kind="danger" disabled={busy || !note.trim()} onPress={() => statusChange('locked')} />}
      </View>
    </>}
  </Panel>;
}
