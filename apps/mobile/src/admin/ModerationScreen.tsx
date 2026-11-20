import { createElement,type ReactNode } from 'react';
import { Platform } from 'react-native';
import { listingLabels } from '../../../../packages/contracts';
import { PostRow } from './PostRow';
import { Text,View } from 'react-native';
import { type Overview,type Page,type Post,type Stats,dateTime,labels,number,price,shortId } from './models';
import { Action,Avatar,Choices,Cover,Empty,Field,MetricGrid,Pagination,Panel,Pill,Search,s } from './ui';
import { layout } from './layout';
import { headings } from './navigation';
import { check,heading,keyValue,options,renderResult,tableHead,type Resource } from './screenParts';

const postFilters = ['pending', 'approved', 'revision', 'rejected', 'removed'];

export function ModerationScreen({ desktop, overview, stats, busy, postStatus, query, showFilters, ascending, category, postType, posts, selected, page, limit,
  onStatus, search, toggleFilters, toggleOrder, onCategory, onType, bulkApprove, onSelect, openPost, pageTo, postsExport, update }: {
  desktop: boolean; overview?: Overview; stats: Resource<Stats>; busy: boolean; postStatus: string; query: string; showFilters: boolean; ascending: boolean;
  category: string; postType: string; posts: Resource<Page<Post>>; selected: string[]; page: number; limit: number;
  onStatus: (key: string) => void; search: (value: string) => void; toggleFilters: () => void; toggleOrder: () => void;
  onCategory: (key: string) => void; onType: (key: string) => void; bulkApprove: () => void;
  onSelect: (id: string) => void; openPost: (id: string) => void; pageTo: (next: number) => void; postsExport: () => void; update: () => void;
}) {
  const result = <T,>(resource: Resource<T>, render: (value: T) => ReactNode) => renderResult(resource, render, update);
  return <>
    {heading('Duyệt bài đăng', headings.posts.subtitle, <Action label="Xuất danh sách" icon="download-outline" disabled={busy} onPress={postsExport} />)}
    {desktop && overview && <MetricGrid wide items={[
      { title: 'Chờ duyệt', value: overview.pending }, { title: 'Bài mới hôm nay', value: overview.pendingToday },
      { title: 'Đã duyệt trong 7 ngày', value: stats.data?.posts.count ?? '—' }, { title: 'Yêu cầu chỉnh sửa', value: overview.revision },
    ]} />}
    <Panel>
      <Choices options={[{ key: '', label: 'Tất cả' }, ...postFilters.map(key => ({ key, label: labels[key] + (key === 'pending' && overview ? ' (' + number(overview.pending) + ')' : '') }))]}
        selected={postStatus} choose={onStatus} />
      <Search value={query} onChange={search} placeholder="Tìm tên tài liệu, người đăng…" />
      <View style={s.wrap}>
        <Action label="Bộ lọc" icon="options-outline" onPress={toggleFilters} />
        <Action label={ascending ? 'Cũ nhất ↑' : 'Mới nhất ↓'} onPress={toggleOrder} />
      </View>
      {showFilters && <View style={s.stack}>
        <Text style={s.label}>DANH MỤC</Text><Choices options={options(['', ...(overview?.categories || [])])} selected={category} choose={onCategory} />
        <Text style={s.label}>HÌNH THỨC</Text><Choices options={[{ key: '', label: 'Tất cả' }, ...Object.entries(listingLabels).map(([key, label]) => ({ key, label }))]}
          selected={postType} choose={onType} />
      </View>}
      {result(posts, value => <>
        {(postStatus === 'pending' || postStatus === '') && !!value.rows.length && <View style={layout.bulk}>
          <Text style={[s.muted, s.flex]}>{selected.length ? 'Đã chọn ' + selected.length + ' bài' : 'Chỉ chọn các bài đã kiểm tra nội dung và quyền chia sẻ.'}</Text>
          {!!selected.length && <Action label="Duyệt bài đã chọn" kind="strong" disabled={busy} onPress={bulkApprove} />}
        </View>}
        {desktop && !!value.rows.length && tableHead(['TÀI LIỆU', 'NGƯỜI ĐĂNG', 'HÌNH THỨC', 'THỜI GIAN GỬI', 'THAO TÁC'])}
        {value.rows.length ? value.rows.map(item => <PostRow key={item.id} item={item} desktop={desktop} selected={selected.includes(item.id)} showStatus={!postStatus} onSelect={() => onSelect(item.id)} onOpen={() => openPost(item.id)} />) : <Empty label="Không tìm thấy bài đăng." />}
        <Pagination page={page} limit={limit} total={value.total} go={pageTo} />
      </>)}
    </Panel>
  </>;
}

export function PostDetail({ item, columns, desktop, fromReport, backPost, pdfPreview, busy, previewPdf, checked, toggleCheck, note, setNote, decidePost }: {
  item: Post; columns: boolean; desktop: boolean; fromReport: boolean; backPost: () => void; pdfPreview?: { id: string; url: string };
  busy: boolean; previewPdf: (inline?: boolean) => void; checked: string[]; toggleCheck: (label: string) => void;
  note: string; setNote: (note: string) => void; decidePost: (decision: string) => void;
}) {
  const copyright = 'Đã xác minh quyền chia sẻ';
  const checks = ['Nội dung hoặc tệp đính kèm rõ ràng', 'Tiêu đề và danh mục phù hợp', copyright];
  return <>
    <View style={{ alignSelf: 'flex-start' }}><Action label={fromReport ? 'Về báo cáo' : 'Về hàng chờ duyệt'} icon="arrow-back" kind="text" onPress={backPost} /></View>
    {heading(desktop ? 'Chi tiết duyệt bài' : item.title, shortId(item.id, 'TL') + ' · ' + dateTime(item.submittedAt || item.createdAt), <Pill value={item.status} />)}
    <View style={[layout.split, columns && layout.splitRow]}>
      <View style={columns && { flex: 1.3 }}><Panel title={item.type === 'digital' ? 'Xem trước tài liệu' : 'Ảnh bìa tài liệu'} subtitle={item.fileName || (item.fileUrl ? 'Liên kết PDF' : undefined)}>
        {Platform.OS === 'web' && pdfPreview?.id === item.id
          ? createElement('iframe', { src: pdfPreview.url, title: 'Xem trước PDF ' + item.title, referrerPolicy: 'no-referrer',
            style: { width: '100%', height: 365, border: 0, borderRadius: 9 } })
          : <Cover post={item} large />}
        {!!(item.fileName || item.fileUrl) && <View style={s.wrap}>
          {Platform.OS === 'web' && !item.fileUrl && <Action label="Xem PDF tại đây" icon="document-text-outline" disabled={busy} onPress={() => previewPdf(true)} />}
          <Action label="Mở PDF ↗" icon="open-outline" disabled={busy} onPress={() => previewPdf()} />
        </View>}
      </Panel></View>
      <View style={columns && s.flex}><Panel title="Thông tin bài đăng">
        <Text style={s.h2}>{item.title}</Text>
        <View style={s.row}><Avatar person={item.owner} /><View style={s.flex}><Text style={s.bold}>{item.owner?.name || 'Người dùng'}</Text><Text style={s.muted}>{item.owner?.school}</Text></View></View>
        {keyValue('Danh mục', [item.category, item.subject].filter(Boolean).join(' / '))}
        {keyValue('Hình thức', listingLabels[item.type] + ' · ' + price(item))}
        {keyValue('Khu vực', item.owner?.region)}
        <Text style={s.body}>{item.description}</Text>
      </Panel></View>
    </View>
    {item.status === 'pending' ? <Panel title="Quyết định kiểm duyệt" subtitle="Quyết định được lưu vào nhật ký và hiển thị trong thông báo của người đăng.">
      <View style={s.stack}>{checks.map(label => <View key={label}>{check(label, checked.includes(label), () => toggleCheck(label))}</View>)}</View>
      <Field label="Ghi chú hoặc lý do" multiline value={note} onChange={setNote} />
      <View style={s.wrap}>
        <Action label="Từ chối" kind="danger" disabled={busy || !note.trim()} onPress={() => decidePost('rejected')} />
        <Action label="Yêu cầu sửa" disabled={busy || !note.trim()} onPress={() => decidePost('revision')} />
        <Action label="Phê duyệt" icon="checkmark" kind="strong" disabled={busy || checked.length !== checks.length} onPress={() => decidePost('approved')} />
      </View>
    </Panel> : <Panel title="Nhật ký kiểm duyệt">
      {item.history?.length ? item.history.map(entry => <View key={entry._id} style={layout.priority}>
        <Pill value={entry.action} /><View style={s.flex}><Text style={s.muted}>{dateTime(entry.createdAt)}</Text>{!!entry.note && <Text style={s.body}>{entry.note}</Text>}</View>
      </View>) : <Text style={s.body}>{item.feedback || 'Chưa có nhật ký cho bài đăng này.'}</Text>}
    </Panel>}
  </>;
}
