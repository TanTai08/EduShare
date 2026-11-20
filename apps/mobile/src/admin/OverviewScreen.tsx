import type { ReactNode } from 'react';
import { PostRow } from './PostRow';
import { Pressable,Text,View } from 'react-native';
import { type Overview,type Page,type Post,type Stats,date,number } from './models';
import { Action,Chart,Empty,Icon,MetricGrid,Panel,colors,s } from './ui';
import { layout } from './layout';
import { headings } from './navigation';
import { heading,renderResult,tableHead,type Resource } from './screenParts';

export function OverviewScreen({ desktop, columns, name, overview, stats, recent, go, highPriority, openPost, update }: {
  desktop: boolean; columns: boolean; name: string; overview?: Overview; stats: Resource<Stats>; recent: Resource<Page<Post>>;
  go: (view: 'posts' | 'users') => void; highPriority: () => void; openPost: (id: string) => void; update: () => void;
}) {
  const result = <T,>(resource: Resource<T>, render: (value: T) => ReactNode) => renderResult(resource, render, update);
  return <>
    {heading('Tổng quan', headings.overview.subtitle, <Text style={s.muted}>{date(new Date().toISOString())}</Text>)}
    <Pressable accessibilityRole="button" onPress={() => go('posts')} style={layout.hero}>
      <View style={s.flex}><Text style={layout.heroTitle}>{desktop ? 'Chào bạn, ' + name + '!' : 'Một cộng đồng tốt hơn'}</Text>
        <Text style={layout.heroSub}>{overview ? number(overview.pending) + ' bài chờ duyệt · ' + number(overview.reports + overview.reviewing) + ' báo cáo đang mở' : 'Xem các bài đăng đang chờ kiểm duyệt'}</Text>
        {desktop && <Text style={layout.heroLink}>Đến hàng chờ duyệt  →</Text>}
      </View>
      <View style={layout.heroIcon}><Icon name={desktop ? 'shield-checkmark-outline' : 'arrow-forward'} size={desktop ? 40 : 21} color={colors.yellow} /></View>
    </Pressable>
    {overview && <MetricGrid wide={desktop} items={[
      { title: 'Người dùng', icon: 'people-outline', value: overview.users, hint: stats.data && '+' + number(stats.data.members.count) + ' trong 7 ngày' },
      { title: 'Tài liệu đã duyệt', icon: 'book-outline', value: overview.approved, hint: stats.data && '+' + number(stats.data.posts.count) + ' trong 7 ngày' },
      { title: 'Chờ duyệt', icon: 'time-outline', value: overview.pending, hint: number(overview.pendingToday) + ' bài mới hôm nay' },
      { title: 'Báo cáo đang mở', icon: 'flag-outline', value: overview.reports + overview.reviewing, hint: number(overview.high) + ' ưu tiên cao' },
    ]} />}
    <View style={[layout.split, columns && layout.splitRow]}>
      <View style={columns && { flex: 2 }}><Panel title="Hoạt động cộng đồng" subtitle="Tài liệu và thành viên mới trong 7 ngày">
        {result(stats, value => <Chart rows={value.timeline} both />)}
      </Panel></View>
      <View style={columns && s.flex}><Panel title="Ưu tiên hôm nay">
        {overview ? <>
          {[
            { count: overview.pending, title: 'Bài đăng chờ duyệt', body: 'Kiểm tra nội dung và quyền chia sẻ', press: () => go('posts') },
            { count: overview.high, title: 'Báo cáo ưu tiên cao', body: 'Kiểm tra bản quyền và dấu hiệu lừa đảo', press: highPriority },
            { count: overview.restricted + overview.locked, title: 'Tài khoản đang bị giới hạn', body: 'Xem trạng thái thành viên', press: () => go('users') },
          ].map(item => <Pressable key={item.title} style={layout.priority} accessibilityRole="button" onPress={item.press}>
            <View style={layout.priorityCount}><Text style={s.bold}>{number(item.count)}</Text></View>
            <View style={s.flex}><Text style={s.bold}>{item.title}</Text><Text style={s.muted}>{item.body}</Text></View><Icon name="chevron-forward" size={15} />
          </Pressable>)}
        </> : <Text style={s.muted}>Đang tải số liệu…</Text>}
      </Panel></View>
    </View>
    <Panel title="Bài đăng mới cần duyệt" action={<Action label="Xem tất cả →" kind="text" onPress={() => go('posts')} />}>
      {result(recent, value => value.rows.length ? <>{desktop && tableHead(['TÀI LIỆU', 'NGƯỜI ĐĂNG', 'HÌNH THỨC', 'TRẠNG THÁI', 'THAO TÁC'])}{value.rows.map(item => <PostRow key={item.id} item={item} desktop={desktop} compact onOpen={() => openPost(item.id)} />)}</>
        : <Empty label="Không có bài chờ duyệt." />)}
    </Panel>
  </>;
}
