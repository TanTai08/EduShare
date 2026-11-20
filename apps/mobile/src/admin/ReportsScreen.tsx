import type { ReactNode } from 'react';
import { Image,Pressable,Text,View } from 'react-native';
import { type Overview,type Page,type Report,type Stats,dateTime,labels,number,shortId } from './models';
import { Action,Avatar,Choices,Empty,Field,Icon,MetricGrid,Pagination,Panel,Pill,Search,s } from './ui';
import { layout } from './layout';
import { headings } from './navigation';
import { heading,options,renderResult,reportLabel,type Resource } from './screenParts';

const reportFilters = ['pending', 'reviewing', 'resolved'];

export function ReportsScreen({ overview, stats, desktop, columns, busy, reportsExport, reportStatus, onStatus, query, search, priority, onPriority,
  reports, reportId, select, details, onDetailLayout, page, limit, pageTo, update }: {
  overview?: Overview; stats: Resource<Stats>; desktop: boolean; columns: boolean; busy: boolean; reportsExport: () => void;
  reportStatus: string; onStatus: (key: string) => void; query: string; search: (value: string) => void; priority: string; onPriority: (key: string) => void;
  reports: Resource<Page<Report>>; reportId: string; select: (id: string) => void; details: ReactNode; onDetailLayout: (y: number) => void;
  page: number; limit: number; pageTo: (next: number) => void; update: () => void;
}) {
  const result = <T,>(resource: Resource<T>, render: (value: T) => ReactNode) => renderResult(resource, render, update);
  return <>
    {heading('Báo cáo vi phạm', headings.reports.subtitle, <Action label="Xuất báo cáo" icon="download-outline" disabled={busy} onPress={reportsExport} />)}
    {desktop && overview && <MetricGrid wide items={[
      { title: 'Đang mở', value: overview.reports + overview.reviewing }, { title: 'Ưu tiên cao', value: overview.high },
      { title: 'Đã xử lý trong 7 ngày', value: stats.data?.resolved.count ?? '—' },
      { title: 'Thời gian xử lý TB', value: stats.data?.averageHours == null ? '—' : number(Math.round(stats.data.averageHours * 10) / 10) + ' giờ' },
    ]} />}
    {!desktop && !!overview?.high && <View style={layout.bulk}><Icon name="flag-outline" /><View style={s.flex}><Text style={s.bold}>{number(overview.high)} báo cáo ưu tiên cao</Text><Text style={s.muted}>Xem xét bản quyền và dấu hiệu lừa đảo trước.</Text></View></View>}
    <View style={[layout.split, columns && layout.splitRow]}>
      <View style={columns && s.flex}><Panel>
        <Choices options={reportFilters.map(key => ({ key, label: labels[reportLabel(key)] + (key === 'pending' && overview ? ' (' + number(overview.reports) + ')' : '') }))}
          selected={reportStatus} choose={onStatus} />
        <Search value={query} onChange={search} placeholder="Tìm mã báo cáo, nội dung…" />
        <Choices options={options(['', 'high', 'normal'])} selected={priority} choose={onPriority} />
        {result(reports, value => <>
          {value.rows.length ? value.rows.map(item => <Pressable key={item.id} accessibilityRole="button" style={[layout.reportRow, item.id === reportId && layout.selected]}
            onPress={() => select(item.id)}>
            <View style={s.flex}><View style={s.wrap}><Text style={s.label}>{shortId(item.id, 'BC')}</Text><Pill value={item.priority} /></View>
              <Text style={s.bold}>{item.title}</Text><Text style={s.body}>{item.reason}</Text><Text style={s.muted}>{dateTime(item.createdAt)}</Text></View>
            <Icon name="chevron-forward" size={16} />
          </Pressable>) : <Empty label="Không tìm thấy báo cáo." />}
          <Pagination page={page} limit={limit} total={value.total} go={pageTo} />
        </>)}
      </Panel></View>
      {reportId && columns ? <View style={{ flex: 1.12 }}>{details}</View> :
        columns && <View style={s.flex}><Panel title="Chi tiết báo cáo"><Empty label="Chọn một báo cáo để xem minh chứng." /></Panel></View>}
    </View>
    {!columns && !!reportId && <View onLayout={event => onDetailLayout(event.nativeEvent.layout.y)}>{details}</View>}

  </>;
}

export function ReportDetail({ item, note, setNote, busy, openPost, setPhoto, onReview, onDismiss, onRemove }: {
  item: Report; note: string; setNote: (note: string) => void; busy: boolean; openPost: (documentId: string, reportId: string) => void;
  setPhoto: (image: string) => void; onReview: () => void; onDismiss: () => void; onRemove: () => void;
}) {
  return <Panel title={'Chi tiết báo cáo ' + shortId(item.id, 'BC')}>
    <View style={s.wrap}><Pill value={reportLabel(item.status)} /><Pill value={item.priority} /></View>
    <View style={layout.reference}><Text style={s.label}>NỘI DUNG BỊ BÁO CÁO</Text><Text style={s.bold}>{item.title}</Text>
      {!!item.document && <><Text style={s.muted}>Người đăng: {item.document.owner?.name || 'Người dùng'}</Text>
        <View style={{ alignSelf: 'flex-start' }}><Action label="Xem bài đăng gốc ↗" kind="text" onPress={() => openPost(item.document!.id, item.id)} /></View></>}
    </View>
    <Text style={s.h2}>Phản hồi của người báo cáo</Text>
    <View style={s.row}><Avatar person={item.reporter} /><View style={s.flex}><Text style={s.bold}>{item.reporter?.name || 'Người dùng'}</Text>
      <Text style={s.muted}>{dateTime(item.createdAt)}</Text></View></View>
    <Text style={s.body}>{item.description}</Text>
    {!!item.image && <Pressable accessibilityRole="button" accessibilityLabel="Mở ảnh minh chứng" onPress={() => setPhoto(item.image!)} style={layout.evidence}>
      <Image source={{ uri: item.image }} style={layout.evidenceThumb} /><Text style={[s.bold, s.flex]}>Ảnh minh chứng</Text><Icon name="open-outline" size={16} />
    </Pressable>}
    {item.status === 'resolved' ? <><Pill value={item.resolution || 'resolved'} />{!!item.note && <Text style={s.body}>{item.note}</Text>}</> : <>
      <Field label="Ghi chú xử lý" value={note} onChange={setNote} multiline />
      <View style={s.wrap}>
        {item.status === 'pending' && <Action label="Nhận xử lý" disabled={busy} onPress={onReview} />}
        <Action label="Bỏ qua báo cáo" disabled={busy} onPress={onDismiss} />
        <Action label="Gỡ bài đăng" kind="danger" disabled={busy || !note.trim() || item.document?.status !== 'approved'} onPress={onRemove} />
      </View>
    </>}
  </Panel>;
}
