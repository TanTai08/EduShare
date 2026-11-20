import { useEffect,useRef,useState } from 'react';
import { ActivityIndicator,BackHandler,Image,Linking,Modal,Platform,Pressable,ScrollView,Text,View,useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { schools as legacySchools, type AcademicSchool } from '../../../../packages/contracts';
import { type AccountDetail,type Api,type Member,type Overview,type Page,type Post,type Report,type Stats,dateTime,labels,number,price } from './models';
import { Action,Avatar,Choices,Empty,Field,Icon,Panel,Search,colors,s } from './ui';

import { layout } from './layout';
import { nav,headings,type ViewName,type Confirm } from './navigation';
import { useData,useDebounced } from './data';
import { exportCsv,exportList } from './exportCsv';
import { heading,renderResult,reportLabel } from './screenParts';
import { OverviewScreen } from './OverviewScreen';
import { ModerationScreen,PostDetail } from './ModerationScreen';
import { UsersScreen,UserDetail } from './UsersScreen';
import { ReportsScreen,ReportDetail } from './ReportsScreen';
import { StatsScreen } from './StatsScreen';

const memberBlank = { name: '', email: '', password: '', schoolId: legacySchools[0].id as string };
const limit = 6;
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
  const [schools, setSchools] = useState<AcademicSchool[]>([...legacySchools]);
  useEffect(() => {
    if (!createOpen) return;
    let active = true;
    void api<AcademicSchool[]>('/schools').then(rows => { if (active) setSchools(rows); }).catch(() => {});
    return () => { active = false; };
  }, [api, createOpen]);
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
  function postsExport() {
    void perform(() => exportList<Post>(api, '/admin/posts', postsQuery, 'edushare-bai-dang.csv',
      ['Mã', 'Tiêu đề', 'Người đăng', 'Danh mục', 'Hình thức', 'Trạng thái', 'Ngày gửi'],
      item => [item.id, item.title, item.owner?.name || '', item.category, price(item), labels[item.status], dateTime(item.submittedAt || item.createdAt)]));
  }
  function reportsExport() {
    void perform(() => exportList<Report>(api, '/admin/reports', reportsQuery, 'edushare-bao-cao.csv',
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

  function toggleFilters() { setShowFilters(value => !value); }
  function toggleOrder() { pageTo(1); setAscending(value => !value); }
  function scrollToDetail(y: number) {
    detailOffset.current = y;
    scroll.current?.scrollTo({ y });
  }
  function selectDetail(id: string, current: string, set: (id: string) => void) {
    set(id); setNote('');
    if (!columns && id === current) scroll.current?.scrollTo({ y: detailOffset.current });
  }
  function bulkApprove() {
    setConfirmation({
      title: 'Duyệt ' + selected.length + ' bài đăng?', description: 'Xác nhận bạn đã kiểm tra nội dung và quyền chia sẻ của tất cả bài đã chọn.', label: 'Xác nhận duyệt',
      action: async () => { await api('/admin/posts/bulk-approve', 'POST', { ids: selected }); pageTo(1); update(); },
    });
  }
  function changeAccountStatus(item: AccountDetail, status: string) {
    setConfirmation({ title: labels[status] + ' tài khoản?', description: 'Tài khoản: ' + item.name,
      label: 'Xác nhận', danger: status === 'locked', action: async () => {
        await api('/admin/users/' + item.id + '/status', 'PATCH', { status, reason: note });
        setNote(''); update();
      },
    });
  }
  async function decideReport(item: Report, action: string) {
    await api('/admin/reports/' + item.id + '/decision', 'POST', { action, note });
    setNote(''); setReportStatus(action === 'review' ? 'reviewing' : 'resolved'); setPage(1); update();
  }
  function confirmRemoval(item: Report) {
    setConfirmation({
      title: 'Gỡ bài đăng?', description: 'Bài sẽ bị ẩn khỏi danh mục. Các giao dịch đã tạo vẫn có thể tiếp tục.',
      label: 'Gỡ bài', danger: true, action: () => decideReport(item, 'remove'),
    });
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
          {tab === 'overview' && <OverviewScreen desktop={desktop} columns={columns} name={me.name} overview={overview} stats={stats} recent={recent} go={go}
            highPriority={() => { go('reports'); setPriority('high'); }} openPost={id => { go('posts'); openPost(id); }} update={update} />}
          {tab === 'posts' && (postId ? renderResult(post, item => <PostDetail item={item} columns={columns} desktop={desktop} fromReport={!!returnReportId}
            backPost={backPost} pdfPreview={pdfPreview} busy={busy} previewPdf={inline => previewPdf(item, inline)}
            checked={checked} toggleCheck={label => toggle(checked, label, setChecked)} note={note} setNote={setNote} decidePost={decision => decidePost(item, decision)} />, update) :
            <ModerationScreen desktop={desktop} overview={overview} stats={stats} busy={busy} postStatus={postStatus} query={query} showFilters={showFilters}
              ascending={ascending} category={category} postType={postType} posts={posts} selected={selected} page={page} limit={limit}
              onStatus={key => applyFilter(setPostStatus, key)} search={search} toggleFilters={toggleFilters} toggleOrder={toggleOrder}
              onCategory={key => applyFilter(setCategory, key)} onType={key => applyFilter(setPostType, key)} bulkApprove={bulkApprove}
              onSelect={id => toggle(selected, id, setSelected)} openPost={openPost} pageTo={pageTo} postsExport={postsExport} update={update} />)}
          {tab === 'users' && <UsersScreen desktop={desktop} columns={columns} overview={overview} query={query} search={search} userStatus={userStatus}
            onStatus={key => applyFilter(setUserStatus, key)} showFilters={showFilters} toggleFilters={toggleFilters} ascending={ascending} toggleOrder={toggleOrder}
            role={role} onRole={key => applyFilter(setRole, key)} users={users} userId={userId} select={id => selectDetail(id, userId, setUserId)}
            details={userId && renderResult(account, item => <UserDetail item={item} note={note} setNote={setNote} busy={busy} setProfileId={setProfileId}
              statusChange={status => changeAccountStatus(item, status)} />, update)}
            onDetailLayout={scrollToDetail} close={() => { setUserId(''); scroll.current?.scrollTo({ y: 0 }); }}
            newMember={() => { setMember(memberBlank); setCreateOpen(true); }} page={page} limit={limit} pageTo={pageTo} update={update} />}
          {tab === 'reports' && <ReportsScreen desktop={desktop} columns={columns} overview={overview} stats={stats} busy={busy} reportsExport={reportsExport}
            reportStatus={reportStatus} onStatus={key => applyFilter(setReportStatus, key)} query={query} search={search} priority={priority}
            onPriority={key => applyFilter(setPriority, key)} reports={reports} reportId={reportId} select={id => selectDetail(id, reportId, setReportId)}
            details={reportId && renderResult(report, item => <ReportDetail item={item} note={note} setNote={setNote} busy={busy} setPhoto={setPhoto}
              openPost={(id, source) => { setTab('posts'); openPost(id, source); }} onRemove={() => confirmRemoval(item)}
              onReview={() => void perform(() => decideReport(item, 'review'), 'Đã chuyển sang đang xử lý.')}
              onDismiss={() => void perform(() => decideReport(item, 'dismiss'), 'Đã xử lý báo cáo.')} />, update)}
            onDetailLayout={scrollToDetail} page={page} limit={limit} pageTo={pageTo} update={update} />}
          {tab === 'stats' && <StatsScreen stats={stats} busy={busy} desktop={desktop} columns={columns} days={days} setDays={setDays} statsExport={statsExport} update={update} />}
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
        {renderResult(profile, item => <><View style={s.row}><Avatar person={item} size={56} /><View style={s.flex}><Text style={s.h2}>{item.name}</Text><Text style={s.muted}>{item.school}</Text></View></View>
          <Text style={s.h2}>Đánh giá từ giao dịch</Text>
          {item.reviews.length ? item.reviews.map(review => <Panel key={review._id}><Text style={s.bold}>{review.rating} ★</Text><Text style={s.body}>{review.text}</Text></Panel>) :
            <Empty label="Chưa có đánh giá." />}</>, update)}
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
