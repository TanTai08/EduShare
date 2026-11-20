import type { ReactNode } from 'react';
import { Text,View } from 'react-native';
import { type Stats,date,number } from './models';
import { Action,Chart,Choices,Empty,MetricGrid,Panel,s } from './ui';
import { layout } from './layout';
import { headings } from './navigation';
import { heading,keyValue,renderResult,tableHead,type Resource } from './screenParts';

const change = (count: number, previous: number) => previous ? new Intl.NumberFormat('vi-VN', { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 }).format((count - previous) / previous) : count ? 'Mới trong kỳ' : '0%';

export function StatsScreen({ stats, busy, desktop, columns, days, setDays, statsExport, update }: {
  stats: Resource<Stats>; busy: boolean; desktop: boolean; columns: boolean; days: number; setDays: (days: number) => void;
  statsExport: (data: Stats) => void; update: () => void;
}) {
  const result = <T,>(resource: Resource<T>, render: (value: T) => ReactNode) => renderResult(resource, render, update);
  return <>
    {heading('Thống kê', headings.stats.subtitle, stats.data && <Action label="Xuất báo cáo" icon="download-outline" disabled={busy} onPress={() => statsExport(stats.data!)} />)}
    <Choices options={[7, 14, 30].map(n => ({ key: String(n), label: n + ' ngày' }))} selected={String(days)} choose={key => setDays(Number(key))} />
    {result(stats, value => <>
      <Text style={s.muted}>{date(value.from)} – {date(new Date(new Date(value.to).getTime() - 1).toISOString())}</Text>
      <MetricGrid wide={desktop} items={[
        { title: 'Thành viên mới', value: value.members.count, hint: change(value.members.count, value.members.previous) },
        { title: 'Tài liệu đã duyệt', value: value.posts.count, hint: change(value.posts.count, value.posts.previous) },
        { title: 'Lượt mở tài liệu', value: value.opens.count, hint: change(value.opens.count, value.opens.previous) },
        { title: 'Báo cáo đã xử lý', value: value.resolved.count, hint: change(value.resolved.count, value.resolved.previous) },
      ]} />
      <View style={[layout.split, columns && layout.splitRow]}>
        <View style={columns && { flex: 1.5 }}><Panel title="Tăng trưởng thành viên" subtitle={number(value.members.count) + ' thành viên mới trong kỳ'}><Chart rows={value.timeline} /></Panel></View>
        <View style={columns && s.flex}><Panel title="Tài liệu theo danh mục">
          {value.categories.length ? value.categories.map(category => <View key={category.name} style={s.stack}>
            {keyValue(category.name, number(category.count) + ' bài')}
            <View style={layout.progressTrack}><View style={[layout.progressBar, { width: `${100 * category.count / (value.posts.count || 1)}%` }]} /></View>
          </View>) : <Empty label="Chưa có tài liệu được duyệt trong kỳ này." />}
        </Panel></View>
      </View>
      <View style={[layout.split, columns && layout.splitRow]}>
        <View style={columns && { flex: 1.5 }}><Panel title="Cộng đồng theo trường" subtitle="Thành viên mới và tài liệu được duyệt trong kỳ">
          {tableHead(['TRƯỜNG / ĐẠI HỌC', 'THÀNH VIÊN MỚI', 'BÀI ĐÃ DUYỆT'])}
          {value.schools.length ? value.schools.map(item => <View key={item.name} style={layout.tableRow}>
            <Text style={[s.bold, { flex: 2 }]}>{item.name}</Text><Text style={[s.body, s.flex]}>{number(item.members)}</Text><Text style={[s.body, s.flex]}>{number(item.posts)}</Text>
          </View>) : <Empty label="Chưa có dữ liệu theo trường." />}
        </Panel></View>
        <View style={columns && s.flex}><Panel title="Chất lượng kiểm duyệt">
          {keyValue('Duyệt ngay lần đầu', value.firstApproval == null ? '—' : new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 }).format(value.firstApproval))}
          {keyValue('Thời gian xử lý trung bình', value.averageHours == null ? '—' : number(Math.round(value.averageHours * 10) / 10) + ' giờ')}
        </Panel></View>
      </View>
    </>)}
  </>;
}
