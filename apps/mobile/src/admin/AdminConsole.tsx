import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, BackHandler, Image, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { schools, listingLabels } from '../../../../packages/contracts';
import { type AccountDetail, type Api, type Member, type Overview, type Page, type Post, type Report, type Stats, date, dateTime, labels, number, price, shortId } from './models';
import { Action, Avatar, Chart, Choices, Cover, Empty, Field, Icon, type IconName, MetricGrid, Pagination, Panel, Pill, Search, colors, s } from './ui';

type Tab = 'overview' | 'posts' | 'users' | 'reports' | 'stats';
type ViewName = Tab | 'settings';
type Confirm = { title: string; description: string; label: string; danger?: boolean; action: () => Promise<void> };
const nav: { key: Tab; title: string; icon: IconName }[] = [
  { key: 'overview', title: 'Tổng quan', icon: 'grid-outline' },
  { key: 'posts', title: 'Duyệt bài', icon: 'document-text-outline' },
  { key: 'users', title: 'Người dùng', icon: 'people-outline' },
  { key: 'reports', title: 'Báo cáo', icon: 'flag-outline' },
  { key: 'stats', title: 'Thống kê', icon: 'bar-chart-outline' },
];
const headings: Record<ViewName, { title: string; subtitle: string }> = {
  overview: { title: 'Tổng quan', subtitle: 'Theo dõi hoạt động và các việc cần xử lý trong cộng đồng EduShare.' },
  posts: { title: 'Duyệt bài đăng', subtitle: 'Kiểm tra chất lượng và quyền chia sẻ trước khi xuất bản.' },
  users: { title: 'Người dùng', subtitle: 'Quản lý tài khoản và theo dõi hoạt động của thành viên.' },
  reports: { title: 'Báo cáo vi phạm', subtitle: 'Xem minh chứng và ghi lại quyết định xử lý.' },
  stats: { title: 'Thống kê', subtitle: 'Theo dõi tăng trưởng, tài liệu và kết quả kiểm duyệt.' },
  settings: { title: 'Cài đặt hệ thống', subtitle: 'Thông tin phiên quản trị EduShare.' },
};
const postFilters = ['pending', 'approved', 'revision', 'rejected', 'removed'];
const accountFilters = ['', 'active', 'restricted', 'locked'];
const reportFilters = ['pending', 'reviewing', 'resolved'];
const memberBlank = { name: '', email: '', password: '', schoolId: schools[0].id as string };
const limit = 6;
const csvCell = (value: string | number) => {
  const raw = String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
};
async function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  if (Platform.OS !== 'web') {
    await Share.share({ title: filename, message: csv });
    return;
  }
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function useData<T>(api: Api, path: string, version: number): { data?: T; error?: string } {
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>();
  const key = path + '\n' + version;
  useEffect(() => {
    if (!path) return;
    let active = true;
    void api<T>(path).then(data => { if (active) setResult({ key, data }); })
      .catch(error => { if (active) setResult({ key, error: error instanceof Error ? error.message : 'Không tải được dữ liệu.' }); });
    return () => { active = false; };
  }, [api, path, key]);
  return result?.key === key ? result : {};
}
function useDebounced(value: string) {
  const [current, setCurrent] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setCurrent(value.trim()), 275);
    return () => clearTimeout(timer);
  }, [value]);
  return current;
}
const options = (keys: string[]) => keys.map(key => ({ key, label: labels[key] || key || 'Tất cả' }));
const reportLabel = (status: string) => status === 'pending' ? 'open' : status;
const change = (count: number, previous: number) => previous ? new Intl.NumberFormat('vi-VN', { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 }).format((count - previous) / previous) : count ? 'Mới trong kỳ' : '0%';

export default function AdminConsole({ api, endpoint, me, logout, logoutBusy, logoutError }: {
  api: Api; endpoint: string; me: { name: string; avatar?: string }; logout: () => void; logoutBusy: boolean; logoutError: string;
}) {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 900;
  const columns = desktop && width >= 1200;
  const [tab, setTab] = useState<ViewName>('overview');
  const [version, reload] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [globalQuery, setGlobalQuery] = useState('');
  const [postStatus, setPostStatus] = useState('pending');
  const [userStatus, setUserStatus] = useState('');
  const [reportStatus, setReportStatus] = useState('pending');
  const [postType, setPostType] = useState('');
  const [category, setCategory] = useState('');
  const [role, setRole] = useState('');
  const [priority, setPriority] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [ascending, setAscending] = useState(false);
  const [postId, setPostId] = useState('');
  const [userId, setUserId] = useState('');
  const [reportId, setReportId] = useState('');
  const [days, setDays] = useState(7);
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [confirmation, setConfirmation] = useState<Confirm>();
  const [createOpen, setCreateOpen] = useState(false);
  const [member, setMember] = useState(memberBlank);
  const [photo, setPhoto] = useState('');
  const [pdfPreview, setPdfPreview] = useState<{ id: string; url: string }>();
  const [profileId, setProfileId] = useState('');
  const detailOffset = useRef(0);
  const [returnReportId, setReturnReportId] = useState('');
  const scroll = useRef<ScrollView>(null);
  const debounced = useDebounced(query);

  function go(next: ViewName, search = '') {
    setTab(next); setPage(1); setQuery(search); setAscending(false); setShowFilters(false);
    setPostStatus(search ? '' : 'pending'); setUserStatus(''); setReportStatus('pending');
    setPostType(''); setCategory(''); setRole(''); setPriority('');
    setPostId(''); setReportId(''); setReturnReportId(''); setUserId(''); setNotice(''); setNote(''); setChecked([]); setSelected([]);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  function openPost(id: string, sourceReport = '') {
    setPostId(id); setPdfPreview(undefined); setReturnReportId(sourceReport); setChecked([]); setNote(''); setNotice('');
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  function backPost() {
    setPostId(''); setNote(''); setNotice('');
    if (returnReportId) {
      setTab('reports'); setReportId(returnReportId); setReturnReportId('');
    }
  }
  const update = () => reload(value => value + 1);
  async function perform(task: () => Promise<void>, success = '') {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setNotice('');
    try { await task(); setNotice(success); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Thao tác chưa hoàn tất.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function applyFilter(set: (key: string) => void, key: string) {
    set(key); setPage(1); setSelected([]); setReportId(''); setUserId(''); setNote('');
  }
  function pageTo(next: number) {
    setPage(next); setSelected([]); setReportId(''); setUserId(''); setNote('');
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  function search(value: string) {
    setQuery(value); setPage(1); setSelected([]); setUserId(''); setReportId(''); setNote('');
  }
  function toggle(list: string[], key: string, set: (list: string[]) => void) {
    set(list.includes(key) ? list.filter(entry => entry !== key) : [...list, key]);
  }
  useEffect(() => {
    const event = BackHandler.addEventListener('hardwareBackPress', () => {
      if (postId) { backPost(); return true; }
      if (userId || reportId) { setUserId(''); setReportId(''); setNote(''); return true; }
      if (tab !== 'overview') { go('overview'); return true; }
      return false;
    });
    return () => event.remove();
  }, [tab, postId, userId, reportId, returnReportId]);

  const summary = useData<Overview>(api, '/admin/overview', version);
  const overview = summary.data;
  const stateQuery = (status: string, extra: Record<string, string> = {}) => {
    return Object.entries({ q: debounced, order: ascending ? 'old' : 'new', status, ...extra })
      .filter(([, value]) => value).map(([key, value]) => key + '=' + encodeURIComponent(value)).join('&');
  };
  const postsQuery = stateQuery(postStatus, { type: postType, category });
  const usersQuery = stateQuery(userStatus, { role });
  const reportsQuery = stateQuery(reportStatus, { priority });
  const listPage = '&limit=' + limit + '&page=' + page;

  const posts = useData<Page<Post>>(api, tab === 'posts' && !postId ? '/admin/posts?' + postsQuery + listPage : '', version);
  const users = useData<Page<Member>>(api, tab === 'users' ? '/admin/users?' + usersQuery + listPage : '', version);
  const reports = useData<Page<Report>>(api, tab === 'reports' ? '/admin/reports?' + reportsQuery + listPage : '', version);
  const recent = useData<Page<Post>>(api, tab === 'overview' ? '/admin/posts?status=pending&limit=3' : '', version);
  const post = useData<Post>(api, postId ? '/admin/posts/' + postId : '', version);
  const account = useData<AccountDetail>(api, userId ? '/admin/users/' + userId : '', version);
  const report = useData<Report>(api, reportId ? '/admin/reports/' + reportId : '', version);
  const stats = useData<Stats>(api, ['overview', 'stats', 'reports', 'posts'].includes(tab) ? '/admin/stats?days=' + (tab === 'stats' ? days : 7) : '', version);
  const profile = useData<Member & { reviews: { _id: string; rating: number; text: string }[] }>(api, profileId ? '/users/' + profileId : '', version);

  function result<T>(resource: { data?: T; error?: string }, render: (value: T) => ReactNode) {
    if (resource.error) return <Panel><Text style={s.body}>{resource.error}</Text><Action label="Thử lại" onPress={update} /></Panel>;
    if (!resource.data) return <ActivityIndicator accessibilityLabel="Đang tải" color={colors.navy} style={{ marginVertical: 16 }} />;
    return render(resource.data);
  }
  function decidePost(item: Post, decision: string) {
    void perform(async () => {
      await api('/admin/posts/' + item.id + '/decision', 'POST', { decision, feedback: note });
      setNote(''); setChecked([]); update();
    }, labels[decision] + ' bài đăng.');
  }
  function previewPdf(item: Post, inline = false) {
    if (inFlight.current) return;
    const popup = Platform.OS === 'web' && !inline ? window.open('about:blank', '_blank') : null;
    if (popup) popup.opener = null;
    void perform(async () => {
      try {
        const target = await api<{ url?: string; path?: string }>('/admin/posts/' + item.id + '/preview', 'POST');
        const url = target.url || endpoint + target.path;
        if (inline) setPdfPreview({ id: item.id, url });
        else if (popup) popup.location.replace(url);
        else await Linking.openURL(url);
      } catch (error) { popup?.close(); throw error; }
    });
  }
  async function exportList<T>(route: string, queryString: string, output: string, headers: string[], values: (row: T) => (string | number)[]) {
    const rows: (string | number)[][] = [headers];
    const batch = 100;
    for (let n = 1; ; n++) {
      const data = await api<Page<T>>(route + '?' + queryString + '&page=' + n + '&limit=' + batch);
      rows.push(...data.rows.map(values));
      if (n * batch >= data.total || !data.rows.length) break;
    }
    await exportCsv(output, rows);
  }
  function postsExport() {
    void perform(() => exportList<Post>('/admin/posts', postsQuery, 'edushare-bai-dang.csv',
      ['Mã', 'Tiêu đề', 'Người đăng', 'Danh mục', 'Hình thức', 'Trạng thái', 'Ngày gửi'],
      item => [item.id, item.title, item.owner?.name || '', item.category, price(item), labels[item.status], dateTime(item.submittedAt || item.createdAt)]));
  }
  function reportsExport() {
    void perform(() => exportList<Report>('/admin/reports', reportsQuery, 'edushare-bao-cao.csv',
      ['Mã', 'Tài liệu', 'Lý do', 'Mức ưu tiên', 'Trạng thái', 'Ngày gửi'],
      item => [item.id, item.title, item.reason, labels[item.priority], labels[reportLabel(item.status)], dateTime(item.createdAt)]));
  }
  function statsExport(data: Stats) {
    void perform(() => exportCsv('edushare-thong-ke.csv', [
      ['Chỉ số', 'Trong kỳ', 'Kỳ trước'],
      ['Thành viên mới', data.members.count, data.members.previous],
      ['Bài được duyệt', data.posts.count, data.posts.previous],
      ['Lượt mở tài liệu', data.opens.count, data.opens.previous],
      ['Báo cáo đã xử lý', data.resolved.count, data.resolved.previous],
      [], ['Ngày', 'Thành viên mới', 'Bài đã duyệt'], ...data.timeline.map(row => [row.date, row.members, row.posts]),
      [], ['Danh mục', 'Bài đã duyệt'], ...data.categories.map(row => [row.name, row.count]),
      [], ['Trường', 'Thành viên mới', 'Bài đã duyệt'], ...data.schools.map(row => [row.name, row.members, row.posts]),
    ]));
  }

  function tableHead(fields: string[]) {
    return <View style={layout.tableHeading}>{fields.map((value, i) => <Text key={value} style={[s.label, { flex: i === 0 ? 2 : 1 }]}>{value}</Text>)}</View>;
  }
  function heading(title: string, subtitle?: string, action?: ReactNode) {
    return <View style={s.between}><View style={s.flex}><Text accessibilityRole="header" style={s.title}>{title}</Text>
      {!!subtitle && <Text style={s.muted}>{subtitle}</Text>}</View>{action}</View>;
  }
  function keyValue(key: string, value?: string) {
    return <View style={s.between}><Text style={s.muted}>{key}</Text><Text style={[s.bold, { flexShrink: 1 }]}>{value || '—'}</Text></View>;
  }
  function check(label: string, isSelected: boolean, onPress: () => void) {
    return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} accessibilityLabel={label} onPress={onPress} style={s.row}>
      <Icon name={isSelected ? 'checkbox' : 'square-outline'} size={21} />{label && <Text style={[s.body, { flexShrink: 1 }]}>{label}</Text>}
    </Pressable>;
  }
  function postRow(item: Post, compact = false) {
    const canSelect = !compact && item.status === 'pending';
    return <View key={item.id} style={[layout.tableRow, !desktop && layout.mobileRow]}>
      <View style={[s.row, { flex: desktop ? 2 : undefined, minWidth: 0 }]}>
        {canSelect && <Pressable accessibilityRole="checkbox" accessibilityLabel={'Chọn ' + item.title} accessibilityState={{ checked: selected.includes(item.id) }}
          onPress={() => toggle(selected, item.id, setSelected)}><Icon name={selected.includes(item.id) ? 'checkbox' : 'square-outline'} /></Pressable>}
        <Cover post={item} /><View style={s.flex}><Text style={s.bold}>{item.title}</Text><Text style={s.muted}>{desktop ? [item.category, item.subject].filter(Boolean).join(' · ') : (item.owner?.name || 'Người dùng') + ' · ' + date(item.submittedAt || item.createdAt)}</Text></View>
      </View>
      {desktop && <View style={[s.row, s.flex]}><Avatar person={item.owner} /><View style={s.flex}>
        <Text numberOfLines={1} style={s.bold}>{item.owner?.name || 'Người dùng'}</Text><Text numberOfLines={1} style={s.muted}>{item.owner?.school}</Text></View></View>}
      <View style={desktop ? s.flex : s.between}><Text style={s.bold}>{price(item)}</Text>{!desktop && <Pill value={item.status} />}</View>
      {desktop && <View style={s.flex}>{compact ? <Pill value={item.status} /> : <><Text style={s.muted}>{dateTime(item.submittedAt || item.createdAt)}</Text>{!postStatus && <Pill value={item.status} />}</>}</View>}
      <View style={desktop ? s.flex : { alignSelf: 'flex-start' }}><Action kind="text" label={item.status === 'pending' ? 'Xem duyệt →' : 'Chi tiết →'} onPress={() => {
        if (tab !== 'posts') go('posts');
        openPost(item.id);
      }} /></View>
    </View>;
  }

  function overviewView() {
    return <>
      {heading('Tổng quan', headings.overview.subtitle, <Text style={s.muted}>{date(new Date().toISOString())}</Text>)}
      <Pressable accessibilityRole="button" onPress={() => go('posts')} style={layout.hero}>
        <View style={s.flex}><Text style={layout.heroTitle}>{desktop ? 'Chào bạn, ' + me.name + '!' : 'Một cộng đồng tốt hơn'}</Text>
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
              { count: overview.high, title: 'Báo cáo ưu tiên cao', body: 'Kiểm tra bản quyền và dấu hiệu lừa đảo', press: () => { go('reports'); setPriority('high'); } },
              { count: overview.restricted + overview.locked, title: 'Tài khoản đang bị giới hạn', body: 'Xem trạng thái thành viên', press: () => go('users') },
            ].map(item => <Pressable key={item.title} style={layout.priority} accessibilityRole="button" onPress={item.press}>
              <View style={layout.priorityCount}><Text style={s.bold}>{number(item.count)}</Text></View>
              <View style={s.flex}><Text style={s.bold}>{item.title}</Text><Text style={s.muted}>{item.body}</Text></View><Icon name="chevron-forward" size={15} />
            </Pressable>)}
          </> : <Text style={s.muted}>Đang tải số liệu…</Text>}
        </Panel></View>
      </View>
      <Panel title="Bài đăng mới cần duyệt" action={<Action label="Xem tất cả →" kind="text" onPress={() => go('posts')} />}>
        {result(recent, value => value.rows.length ? <>{desktop && tableHead(['TÀI LIỆU', 'NGƯỜI ĐĂNG', 'HÌNH THỨC', 'TRẠNG THÁI', 'THAO TÁC'])}{value.rows.map(item => postRow(item, true))}</>
          : <Empty label="Không có bài chờ duyệt." />)}
      </Panel>
    </>;
  }

  function postsView() {
    if (postId) return result(post, postDetail);
    return <>
      {heading('Duyệt bài đăng', headings.posts.subtitle, <Action label="Xuất danh sách" icon="download-outline" disabled={busy} onPress={postsExport} />)}
      {desktop && overview && <MetricGrid wide items={[
        { title: 'Chờ duyệt', value: overview.pending }, { title: 'Bài mới hôm nay', value: overview.pendingToday },
        { title: 'Đã duyệt trong 7 ngày', value: stats.data?.posts.count ?? '—' }, { title: 'Yêu cầu chỉnh sửa', value: overview.revision },
      ]} />}
      <Panel>
        <Choices options={[{ key: '', label: 'Tất cả' }, ...postFilters.map(key => ({ key, label: labels[key] + (key === 'pending' && overview ? ' (' + number(overview.pending) + ')' : '') }))]}
          selected={postStatus} choose={key => applyFilter(setPostStatus, key)} />
        <Search value={query} onChange={search} placeholder="Tìm tên tài liệu, người đăng…" />
        <View style={s.wrap}>
          <Action label="Bộ lọc" icon="options-outline" onPress={() => setShowFilters(value => !value)} />
          <Action label={ascending ? 'Cũ nhất ↑' : 'Mới nhất ↓'} onPress={() => { pageTo(1); setAscending(value => !value); }} />
        </View>
        {showFilters && <View style={s.stack}>
          <Text style={s.label}>DANH MỤC</Text><Choices options={options(['', ...(overview?.categories || [])])} selected={category} choose={key => applyFilter(setCategory, key)} />
          <Text style={s.label}>HÌNH THỨC</Text><Choices options={[{ key: '', label: 'Tất cả' }, ...Object.entries(listingLabels).map(([key, label]) => ({ key, label }))]}
            selected={postType} choose={key => applyFilter(setPostType, key)} />
        </View>}
        {result(posts, value => <>
          {(postStatus === 'pending' || postStatus === '') && !!value.rows.length && <View style={layout.bulk}>
            <Text style={[s.muted, s.flex]}>{selected.length ? 'Đã chọn ' + selected.length + ' bài' : 'Chỉ chọn các bài đã kiểm tra nội dung và quyền chia sẻ.'}</Text>
            {!!selected.length && <Action label="Duyệt bài đã chọn" kind="strong" disabled={busy} onPress={() => setConfirmation({
              title: 'Duyệt ' + selected.length + ' bài đăng?', description: 'Xác nhận bạn đã kiểm tra nội dung và quyền chia sẻ của tất cả bài đã chọn.', label: 'Xác nhận duyệt',
              action: async () => { await api('/admin/posts/bulk-approve', 'POST', { ids: selected }); pageTo(1); update(); },
            })} />}
          </View>}
          {desktop && !!value.rows.length && tableHead(['TÀI LIỆU', 'NGƯỜI ĐĂNG', 'HÌNH THỨC', 'THỜI GIAN GỬI', 'THAO TÁC'])}
          {value.rows.length ? value.rows.map(item => postRow(item)) : <Empty label="Không tìm thấy bài đăng." />}
          <Pagination page={page} limit={limit} total={value.total} go={pageTo} />
        </>)}
      </Panel>
    </>;
  }
  function postDetail(item: Post) {
    const copyright = 'Đã xác minh quyền chia sẻ';
    const checks = ['Nội dung hoặc tệp đính kèm rõ ràng', 'Tiêu đề và danh mục phù hợp', copyright];
    return <>
      <View style={{ alignSelf: 'flex-start' }}><Action label={returnReportId ? 'Về báo cáo' : 'Về hàng chờ duyệt'} icon="arrow-back" kind="text" onPress={backPost} /></View>
      {heading(desktop ? 'Chi tiết duyệt bài' : item.title, shortId(item.id, 'TL') + ' · ' + dateTime(item.submittedAt || item.createdAt), <Pill value={item.status} />)}
      <View style={[layout.split, columns && layout.splitRow]}>
        <View style={columns && { flex: 1.3 }}><Panel title={item.type === 'digital' ? 'Xem trước tài liệu' : 'Ảnh bìa tài liệu'} subtitle={item.fileName || (item.fileUrl ? 'Liên kết PDF' : undefined)}>
          {Platform.OS === 'web' && pdfPreview?.id === item.id
            ? createElement('iframe', { src: pdfPreview.url, title: 'Xem trước PDF ' + item.title, referrerPolicy: 'no-referrer',
              style: { width: '100%', height: 365, border: 0, borderRadius: 9 } })
            : <Cover post={item} large />}
          {!!(item.fileName || item.fileUrl) && <View style={s.wrap}>
            {Platform.OS === 'web' && !item.fileUrl && <Action label="Xem PDF tại đây" icon="document-text-outline" disabled={busy} onPress={() => previewPdf(item, true)} />}
            <Action label="Mở PDF ↗" icon="open-outline" disabled={busy} onPress={() => previewPdf(item)} />
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
        <View style={s.stack}>{checks.map(label => <View key={label}>{check(label, checked.includes(label), () => toggle(checked, label, setChecked))}</View>)}</View>
        <Field label="Ghi chú hoặc lý do" multiline value={note} onChange={setNote} />
        <View style={s.wrap}>
          <Action label="Từ chối" kind="danger" disabled={busy || !note.trim()} onPress={() => decidePost(item, 'rejected')} />
          <Action label="Yêu cầu sửa" disabled={busy || !note.trim()} onPress={() => decidePost(item, 'revision')} />
          <Action label="Phê duyệt" icon="checkmark" kind="strong" disabled={busy || checked.length !== checks.length} onPress={() => decidePost(item, 'approved')} />
        </View>
      </Panel> : <Panel title="Nhật ký kiểm duyệt">
        {item.history?.length ? item.history.map(entry => <View key={entry._id} style={layout.priority}>
          <Pill value={entry.action} /><View style={s.flex}><Text style={s.muted}>{dateTime(entry.createdAt)}</Text>{!!entry.note && <Text style={s.body}>{entry.note}</Text>}</View>
        </View>) : <Text style={s.body}>{item.feedback || 'Chưa có nhật ký cho bài đăng này.'}</Text>}
      </Panel>}
    </>;
  }

  function usersView() {
    const details = userId && result(account, userDetail);
    return <>
      {heading('Người dùng', overview ? number(overview.users) + ' thành viên trong cộng đồng' : headings.users.subtitle,
        <Action label="Thêm thành viên" icon="add" kind="strong" onPress={() => { setMember(memberBlank); setCreateOpen(true); }} />)}
      {overview && <MetricGrid wide={desktop} items={[
        { title: 'Tổng người dùng', value: overview.users }, { title: 'Đang hoạt động', value: overview.active },
        { title: 'Đang hạn chế', value: overview.restricted }, { title: 'Đã khóa', value: overview.locked },
      ]} />}
      <View style={[layout.split, columns && layout.splitRow]}>
        <View style={columns && { flex: 2 }}><Panel title="Danh sách người dùng">
          <Search value={query} onChange={search} placeholder="Tìm tên, email hoặc mã người dùng…" />
          <Choices options={options(accountFilters)} selected={userStatus} choose={key => applyFilter(setUserStatus, key)} />
          <View style={s.wrap}><Action label="Vai trò" icon="options-outline" onPress={() => setShowFilters(value => !value)} />
            <Action label={ascending ? 'Cũ nhất ↑' : 'Mới nhất ↓'} onPress={() => { pageTo(1); setAscending(value => !value); }} /></View>
          {showFilters && <Choices options={options(['', 'student', 'admin'])} selected={role} choose={key => applyFilter(setRole, key)} />}
          {result(users, value => <>
            {desktop && !!value.rows.length && tableHead(['THÀNH VIÊN', 'VAI TRÒ', 'TRẠNG THÁI', 'THAM GIA'])}
            {value.rows.length ? value.rows.map(item => <Pressable accessibilityRole="button" key={item.id} onPress={() => { setUserId(item.id); setNote(''); if (!columns && item.id === userId) scroll.current?.scrollTo({ y: detailOffset.current }); }}
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
      {!columns && !!userId && <View onLayout={event => {
        detailOffset.current = event.nativeEvent.layout.y;
        scroll.current?.scrollTo({ y: detailOffset.current });
      }}>
        <Action label="Đóng hồ sơ" icon="close" onPress={() => { setUserId(''); scroll.current?.scrollTo({ y: 0 }); }} />
        {details}
      </View>}

    </>;
  }
  function userDetail(item: AccountDetail) {
    function statusChange(status: string) {
      setConfirmation({ title: labels[status] + ' tài khoản?', description: 'Tài khoản: ' + item.name,
        label: 'Xác nhận', danger: status === 'locked', action: async () => {
          await api('/admin/users/' + item.id + '/status', 'PATCH', { status, reason: note });
          setNote(''); update();
        },
      });
    }
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

  function reportsView() {
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
            selected={reportStatus} choose={key => applyFilter(setReportStatus, key)} />
          <Search value={query} onChange={search} placeholder="Tìm mã báo cáo, nội dung…" />
          <Choices options={options(['', 'high', 'normal'])} selected={priority} choose={key => applyFilter(setPriority, key)} />
          {result(reports, value => <>
            {value.rows.length ? value.rows.map(item => <Pressable key={item.id} accessibilityRole="button" style={[layout.reportRow, item.id === reportId && layout.selected]}
              onPress={() => { setReportId(item.id); setNote(''); if (!columns && item.id === reportId) scroll.current?.scrollTo({ y: detailOffset.current }); }}>
              <View style={s.flex}><View style={s.wrap}><Text style={s.label}>{shortId(item.id, 'BC')}</Text><Pill value={item.priority} /></View>
                <Text style={s.bold}>{item.title}</Text><Text style={s.body}>{item.reason}</Text><Text style={s.muted}>{dateTime(item.createdAt)}</Text></View>
              <Icon name="chevron-forward" size={16} />
            </Pressable>) : <Empty label="Không tìm thấy báo cáo." />}
            <Pagination page={page} limit={limit} total={value.total} go={pageTo} />
          </>)}
        </Panel></View>
        {reportId && columns ? <View style={{ flex: 1.12 }}>{result(report, reportDetail)}</View> :
          columns && <View style={s.flex}><Panel title="Chi tiết báo cáo"><Empty label="Chọn một báo cáo để xem minh chứng." /></Panel></View>}
      </View>
      {!columns && !!reportId && <View onLayout={event => {
        detailOffset.current = event.nativeEvent.layout.y;
        scroll.current?.scrollTo({ y: detailOffset.current });
      }}>{result(report, reportDetail)}</View>}

    </>;
  }
  function reportDetail(item: Report) {
    async function decide(action: string) {
      await api('/admin/reports/' + item.id + '/decision', 'POST', { action, note });
      setNote(''); setReportStatus(action === 'review' ? 'reviewing' : 'resolved'); setPage(1); update();
    }
    return <Panel title={'Chi tiết báo cáo ' + shortId(item.id, 'BC')}>
      <View style={s.wrap}><Pill value={reportLabel(item.status)} /><Pill value={item.priority} /></View>
      <View style={layout.reference}><Text style={s.label}>NỘI DUNG BỊ BÁO CÁO</Text><Text style={s.bold}>{item.title}</Text>
        {!!item.document && <><Text style={s.muted}>Người đăng: {item.document.owner?.name || 'Người dùng'}</Text>
          <View style={{ alignSelf: 'flex-start' }}><Action label="Xem bài đăng gốc ↗" kind="text" onPress={() => {
            setTab('posts'); openPost(item.document!.id, item.id);
          }} /></View></>}
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
          {item.status === 'pending' && <Action label="Nhận xử lý" disabled={busy} onPress={() => void perform(() => decide('review'), 'Đã chuyển sang đang xử lý.')} />}
          <Action label="Bỏ qua báo cáo" disabled={busy} onPress={() => void perform(() => decide('dismiss'), 'Đã xử lý báo cáo.')} />
          <Action label="Gỡ bài đăng" kind="danger" disabled={busy || !note.trim() || item.document?.status !== 'approved'} onPress={() => setConfirmation({
            title: 'Gỡ bài đăng?', description: 'Bài sẽ bị ẩn khỏi danh mục. Các giao dịch đã tạo vẫn có thể tiếp tục.',
            label: 'Gỡ bài', danger: true, action: () => decide('remove'),
          })} />
        </View>
      </>}
    </Panel>;
  }

  function statsView() {
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

  function navItem(item: typeof nav[number]) {
    const active = tab === item.key;
    const count = item.key === 'posts' ? overview?.pending : item.key === 'reports' && overview ? overview.reports + overview.reviewing : null;
    return <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ selected: active }} key={item.key} onPress={() => go(item.key)}
      style={desktop ? [layout.navItem, active && layout.navActive] : layout.bottomItem}>
      <Icon name={item.icon} size={desktop ? 19 : 21} color={desktop && !active ? '#d1dee8' : colors.navy} />
      <Text numberOfLines={1} style={desktop ? [layout.navText, active && layout.navTextActive] : [layout.bottomLabel, active && layout.bottomActive]}>{item.title}</Text>
      {desktop && !!count && <Text style={[layout.navBadge, active && layout.navBadgeActive]}>{number(count)}</Text>}
    </Pressable>;
  }
  const header = postId ? 'Chi tiết duyệt bài' : headings[tab].title;
  return <SafeAreaView style={layout.safe} edges={desktop ? [] : ['top', 'bottom']}>
    <View style={layout.shell}>
      {desktop && <View style={layout.sidebar}>
        <View style={layout.brand}><View style={layout.logo}><Icon name="book-outline" size={22} /></View>
          <View><Text style={layout.brandText}>EduShare</Text><Text style={layout.brandKicker}>TRUNG TÂM QUẢN TRỊ</Text></View></View>
        <Text style={layout.navKicker}>KHÔNG GIAN LÀM VIỆC</Text>
        <View style={layout.nav}>{nav.map(navItem)}</View>
        <View style={layout.sidebarRule} />
        <Pressable accessibilityRole="button" accessibilityLabel="Cài đặt hệ thống" onPress={() => go('settings')} style={[layout.navItem, tab === 'settings' && layout.navActive]}>
          <Icon name="settings-outline" color={tab === 'settings' ? colors.navy : '#d1dee8'} />
          <Text style={[layout.navText, tab === 'settings' && layout.navTextActive]}>Cài đặt hệ thống</Text>
        </Pressable>
        <View style={s.flex} />
        <View style={layout.sideNote}><Icon name="shield-checkmark-outline" color={colors.yellow} />
          <Text style={layout.sideNoteTitle}>Cộng đồng an toàn</Text><Text style={layout.sideNoteText}>Quyền: Quản trị viên</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Đăng xuất" onPress={logout} disabled={logoutBusy} style={layout.navItem}>
          <Icon name="log-out-outline" color="#d1dee8" /><Text style={layout.navText}>Đăng xuất</Text>
        </Pressable>
      </View>}
      <View style={s.flex}>
        <View style={[layout.top, !desktop && layout.mobileTop]}>
          {desktop ? <><Text style={[s.body, s.flex]}>Quản trị  /  <Text style={s.bold}>{header}</Text></Text>
            <View style={layout.globalSearch}><Search value={globalQuery} onChange={setGlobalQuery} placeholder="Tìm kiếm tài liệu, người dùng…" onSubmit={() => {
              if (globalQuery.trim()) go(tab === 'users' ? 'users' : 'posts', globalQuery.trim());
            }} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Báo cáo vi phạm" onPress={() => go('reports')}><Icon name="notifications-outline" size={22} /></Pressable>
          </> : <View style={[layout.brand, s.flex]}><View style={layout.logo}><Icon name="book-outline" size={20} /></View>
            <View><Text style={layout.mobileBrand}>EduShare</Text><Text style={s.label}>QUẢN TRỊ</Text></View></View>}
          <Pressable accessibilityRole="button" accessibilityLabel="Phiên quản trị" style={s.row} onPress={() => go('settings')}>
            <Avatar person={me} />{desktop && <View><Text style={s.bold}>{me.name}</Text><Text style={s.muted}>Quản trị viên</Text></View>}
          </Pressable>
        </View>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[layout.content, desktop && layout.contentWide]}>
          {!createOpen && (notice || logoutError) !== '' && <View style={layout.notice}><Icon name="information-circle-outline" /><Text accessibilityLiveRegion="polite" style={[s.body, s.flex]}>{notice || logoutError}</Text></View>}
          {busy && <ActivityIndicator accessibilityLabel="Đang xử lý" color={colors.navy} />}
          {!!summary.error && tab !== 'settings' && <Panel><Text style={s.body}>{summary.error}</Text><Action label="Tải lại tổng quan" onPress={update} /></Panel>}
          {tab === 'overview' && overviewView()}
          {tab === 'posts' && postsView()}
          {tab === 'users' && usersView()}
          {tab === 'reports' && reportsView()}
          {tab === 'stats' && statsView()}
          {tab === 'settings' && <>{heading(header, headings.settings.subtitle)}<Panel title="Tài khoản quản trị">
            <View style={s.row}><Avatar person={me} size={48} /><View><Text style={s.bold}>{me.name}</Text><Text style={s.muted}>Quản trị viên</Text></View></View>
            <View style={s.wrap}><Action label="Cập nhật dữ liệu" icon="refresh" onPress={update} /><Action label="Đăng xuất" icon="log-out-outline" disabled={logoutBusy} onPress={logout} /></View>
          </Panel></>}
        </ScrollView>
        {!desktop && <View style={layout.bottom}>{nav.map(navItem)}</View>}
      </View>
    </View>
    <Modal visible={createOpen} animationType="fade" transparent onRequestClose={() => setCreateOpen(false)}>
      <View style={layout.overlay}><View style={layout.dialog}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.stack}>
        <Text accessibilityRole="header" style={s.h2}>Thêm thành viên</Text>
        {(['name', 'email', 'password'] as const).map((key, i) => <Field key={key} label={['Họ và tên', 'Email', 'Mật khẩu'][i]}
          value={member[key]} secret={key === 'password'} onChange={value => setMember(current => ({ ...current, [key]: value }))} />)}
        <Text style={s.bold}>Trường</Text><Choices options={schools.map(item => ({ key: item.id, label: item.name }))} selected={member.schoolId}
          choose={schoolId => setMember(current => ({ ...current, schoolId }))} />
        {createOpen && !!notice && <Text accessibilityLiveRegion="polite" style={s.body}>{notice}</Text>}
        <View style={s.wrap}><Action label="Hủy" onPress={() => { setCreateOpen(false); setNotice(''); }} />
          <Action label="Tạo tài khoản" kind="strong" disabled={busy || !member.name.trim() || !member.email.trim() || member.password.length < 8}
            onPress={() => void perform(async () => {
              const created = await api<Member>('/admin/users', 'POST', member);
              go('users'); setUserId(created.id); setCreateOpen(false); setMember(memberBlank); update();
            }, 'Đã tạo tài khoản thành viên.')} /></View>
      </ScrollView></View></View>
    </Modal>
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={() => setPhoto('')}>
      <View style={layout.overlay}><View style={layout.dialog}>
        {!!photo && <Image source={{ uri: photo }} accessibilityLabel="Ảnh minh chứng" style={layout.fullEvidence} resizeMode="contain" />}
        <Action label="Đóng ảnh" icon="close" onPress={() => setPhoto('')} />
      </View></View>
    </Modal>
    <Modal visible={!!profileId} transparent animationType="fade" onRequestClose={() => setProfileId('')}>
      <View style={layout.overlay}><View style={layout.dialog}><ScrollView contentContainerStyle={s.stack}>
        <Action label="Đóng hồ sơ công khai" icon="close" onPress={() => setProfileId('')} />
        {result(profile, item => <><View style={s.row}><Avatar person={item} size={56} /><View style={s.flex}><Text style={s.h2}>{item.name}</Text><Text style={s.muted}>{item.school}</Text></View></View>
          <Text style={s.h2}>Đánh giá từ giao dịch</Text>
          {item.reviews.length ? item.reviews.map(review => <Panel key={review._id}><Text style={s.bold}>{review.rating} ★</Text><Text style={s.body}>{review.text}</Text></Panel>) :
            <Empty label="Chưa có đánh giá." />}</>)}
      </ScrollView></View></View>
    </Modal>
    <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => setConfirmation(undefined)}>
      {!!confirmation && <View style={layout.overlay}><View style={layout.dialog}>
        <Text accessibilityRole="header" style={s.h2}>{confirmation.title}</Text><Text style={s.body}>{confirmation.description}</Text>
        <View style={s.wrap}><Action label="Hủy" onPress={() => setConfirmation(undefined)} />
          <Action label={confirmation.label} disabled={busy} kind={confirmation.danger ? 'danger' : 'strong'} onPress={() => {
            const action = confirmation.action;
            setConfirmation(undefined);
            void perform(action, 'Đã lưu quyết định.');
          }} /></View>
      </View></View>}
    </Modal>
  </SafeAreaView>;
}

const layout = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  shell: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  sidebar: { width: 232, padding: 16, paddingTop: 28, backgroundColor: colors.navy, gap: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 7 },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.yellow },
  brandText: { color: colors.white, fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  brandKicker: { color: '#b9c7d4', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  mobileBrand: { color: colors.navy, fontSize: 17, fontWeight: '900' },
  navKicker: { marginTop: 35, paddingHorizontal: 8, color: '#b9c7d4', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  nav: { gap: 7 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, minHeight: 44, borderRadius: 9 },
  navActive: { backgroundColor: colors.yellow },
  navText: { color: '#e1e8ef', fontSize: 14, fontWeight: '700', flex: 1 },
  navTextActive: { color: colors.ink },
  navBadge: { color: colors.white, backgroundColor: '#344c61', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7, fontSize: 11, fontWeight: '800' },
  navBadgeActive: { color: colors.navy, backgroundColor: '#e4b60b' },
  sidebarRule: { height: 1, backgroundColor: '#3b4f62', marginHorizontal: 8, marginTop: 13 },
  sideNote: { backgroundColor: '#2c4459', borderRadius: 12, gap: 6, padding: 13 },
  sideNoteTitle: { color: colors.white, fontWeight: '800', fontSize: 13 },
  sideNoteText: { color: '#d1dee8', fontSize: 12 },
  top: { height: 76, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.line },
  mobileTop: { height: 63, paddingHorizontal: 14, gap: 10 },
  globalSearch: { flex: 1, maxWidth: 370, minWidth: 175 },
  content: { width: '100%', maxWidth: 1440, alignSelf: 'center', padding: 16, paddingBottom: 26, gap: 15 },
  contentWide: { padding: 26, gap: 18 },
  bottom: { backgroundColor: colors.white, flexDirection: 'row', minHeight: 59, borderTopWidth: 1, borderColor: colors.line },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7 },
  bottomLabel: { color: colors.muted, fontWeight: '600', fontSize: 10 },
  bottomActive: { color: '#805b08', fontWeight: '900' },
  hero: { flexDirection: 'row', alignItems: 'center', minHeight: 88, borderRadius: 13, gap: 10, backgroundColor: colors.navy, padding: 20 },
  heroTitle: { color: colors.white, fontWeight: '800', fontSize: 20 },
  heroSub: { color: '#e1e8ef', marginTop: 5, fontSize: 13 },
  heroLink: { color: colors.yellow, marginTop: 12, fontSize: 13, fontWeight: '800' },
  heroIcon: { borderRadius: 14, padding: 12, backgroundColor: '#2c4459' },
  split: { gap: 14 },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  priority: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 9, borderBottomWidth: 1, borderColor: colors.line },
  priorityCount: { backgroundColor: colors.pale, borderRadius: 8, minWidth: 36, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  tableHeading: { flexDirection: 'row', gap: 10, paddingVertical: 9, paddingHorizontal: 8, backgroundColor: colors.bg, borderRadius: 7 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, gap: 10, borderBottomWidth: 1, borderColor: colors.line },
  mobileRow: { flexDirection: 'column', alignItems: 'stretch', borderWidth: 1, borderRadius: 9, gap: 8, padding: 10 },
  bulk: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderRadius: 9, padding: 10, backgroundColor: colors.pale },
  memberIdentity: { alignItems: 'center', gap: 7 },
  memberStats: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: colors.bg, borderRadius: 9 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 9 },
  selected: { backgroundColor: '#fffae3', borderColor: '#f2da7c' },
  reference: { backgroundColor: colors.bg, padding: 11, borderRadius: 9, gap: 6 },
  evidence: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  evidenceThumb: { width: 43, height: 43, borderRadius: 6 },
  fullEvidence: { width: '100%', height: 360 },
  progressTrack: { height: 8, borderRadius: 5, backgroundColor: colors.bg, overflow: 'hidden' },
  progressBar: { height: 8, borderRadius: 5, backgroundColor: colors.yellow },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: colors.blue },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#14223099', padding: 17 },
  dialog: { width: '100%', maxWidth: 580, maxHeight: '93%', backgroundColor: colors.white, borderRadius: 14, padding: 17, gap: 12 },
});
