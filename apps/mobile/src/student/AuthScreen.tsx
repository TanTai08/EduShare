import type { Dispatch, SetStateAction } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { schools } from '../../../../packages/contracts';
import { palette } from './Workspace';
import { styles } from './styles';

export function AuthScreen({ page, desktop, open, leaveAuth, name, setName, email, setEmail, password, setPassword, confirmation, setConfirmation,
  schoolsOpen, setSchoolsOpen, schoolId, setSchool, notice, busy, authenticate }: {
  page: 'welcome' | 'login' | 'register'; desktop: boolean; open: (page: 'welcome' | 'login' | 'register' | 'home') => void; leaveAuth: () => void;
  name: string; setName: (value: string) => void; email: string; setEmail: (value: string) => void;
  password: string; setPassword: (value: string) => void; confirmation: string; setConfirmation: (value: string) => void;
  schoolsOpen: boolean; setSchoolsOpen: Dispatch<SetStateAction<boolean>>; schoolId: string; setSchool: (value: string) => void;
  notice: string; busy: boolean; authenticate: () => void;
}) {
  const welcome = page === 'welcome';
  const register = page === 'register';
  const title = register ? 'Đăng ký' : 'Đăng nhập';
  return <SafeAreaView style={[authStyles.shell, !welcome && authStyles.yellow, desktop && styles.webShell]} edges={['top']}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[authStyles.scroll, desktop && authStyles.webAuth]}>
      {desktop && <View style={authStyles.webArt}>
        <Image source={require('../../assets/library-hero.webp')} style={authStyles.webArtImage} resizeMode="cover" />
        <View style={authStyles.webArtText}><View style={styles.brandIcon}><Ionicons name="book-outline" size={18} color={palette.navy} /></View>
          <Text style={authStyles.webBrand}>EduShare</Text>
          <Text style={authStyles.webDescription}>Tài liệu học tập cho sinh viên</Text>
        </View>
      </View>}
      <View style={desktop ? authStyles.webAuthMain : styles.authMain}>
        {welcome ? <>
          {!desktop && <View style={authStyles.intro}>
            <View style={authStyles.illustration}><Ionicons name="library" size={74} color="#26396e" /><Ionicons name="school" size={39} color="#26396e" /></View>
            <Text style={authStyles.brand}>EduShare</Text><Text style={authStyles.muted}>Tài liệu học tập cho sinh viên</Text>
          </View>}
          <View style={[authStyles.welcomePanel, desktop && authStyles.webWelcome]}>
            <Text accessibilityRole={desktop ? 'header' : undefined} style={authStyles.title}>Chào mừng!</Text>
            <Text style={authStyles.description}>Mua, trao đổi và tải tài liệu học tập cùng cộng đồng sinh viên.</Text>
            <View style={authStyles.actions}>
              <AuthButton caption="Đăng nhập" press={() => open('login')} />
              <AuthButton caption="Đăng ký" light press={() => open('register')} />
            </View>
            <Pressable accessibilityRole="button" onPress={() => open('home')}><Text style={authStyles.guest}>Khám phá tài liệu</Text></Pressable>
          </View>
        </> : <>
          <View style={[authStyles.header, desktop && authStyles.webAuthHeader]}>
            <View style={authStyles.headerRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={12} onPress={leaveAuth}><Ionicons name="arrow-back" size={22} color="#151512" /></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setSchoolsOpen(false); open(register ? 'login' : 'register'); }}><Text style={authStyles.link}>{register ? 'Đăng nhập' : 'Đăng ký'}</Text></Pressable>
            </View>
            <Text accessibilityRole={desktop ? 'header' : undefined} style={authStyles.title}>{title}</Text>
            <Text style={authStyles.description}>{register ? 'Tạo tài khoản để chia sẻ tài liệu học tập.' : 'Chào mừng bạn trở lại EduShare.'}</Text>
          </View>
          <View style={[authStyles.form, desktop && authStyles.webAuthForm]}>
            {register && <AuthInput label="Họ và tên" value={name} change={setName} />}
            <AuthInput label="Email sinh viên" value={email} change={setEmail} email />
            <AuthInput label="Mật khẩu" value={password} change={setPassword} secret />
            {register && <>
              <AuthInput label="Xác nhận mật khẩu" value={confirmation} change={setConfirmation} secret />
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: schoolsOpen }} style={authStyles.school} onPress={() => setSchoolsOpen(value => !value)}>
                <Text style={authStyles.schoolText}>{schools.find(s => s.id === schoolId)?.name}</Text><Ionicons name={schoolsOpen ? 'chevron-up' : 'chevron-down'} size={16} />
              </Pressable>
              {schoolsOpen && schools.map(s => <Pressable key={s.id} accessibilityRole="button" accessibilityState={{ selected: s.id === schoolId }} style={authStyles.school} onPress={() => { setSchool(s.id); setSchoolsOpen(false); }}>
                <Text style={authStyles.schoolText}>{s.name}</Text>{s.id === schoolId && <Ionicons name="checkmark" size={18} />}
              </Pressable>)}
            </>}
            {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
            <View style={authStyles.submit}><AuthButton caption={busy ? 'Đang xử lý…' : title} press={authenticate} disabled={busy} /></View>
          </View>
        </>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function AuthInput({ label, value, change, email, secret }: { label: string; value: string; change: (value: string) => void; email?: boolean; secret?: boolean }) {
  return <TextInput accessibilityLabel={label} value={value} onChangeText={change} placeholder={label} placeholderTextColor="#64645d" secureTextEntry={secret} keyboardType={email ? 'email-address' : 'default'} autoCapitalize={email || secret ? 'none' : 'words'} autoCorrect={false} style={authStyles.input} />;
}
function AuthButton({ caption, press, light, disabled }: { caption: string; press: () => void; light?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={press} style={[authStyles.button, light && authStyles.light]}>
    <Text style={[authStyles.buttonText, light && authStyles.link]}>{caption}</Text>
  </Pressable>;
}
const authStyles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#fff' },
  webAuth: { maxWidth: 1060, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 30, gap: 22 },
  webArt: { width: '50%', minHeight: 550, backgroundColor: palette.navy, overflow: 'hidden', borderRadius: 18, justifyContent: 'flex-end' },
  webArtImage: { position: 'absolute', width: '100%', height: '100%' },
  webArtText: { alignSelf: 'stretch', gap: 7, backgroundColor: '#fff3d7ed', padding: 22 },
  webBrand: { fontSize: 31, color: palette.ink, fontWeight: '900' },
  webDescription: { fontSize: 14, color: palette.muted },
  webAuthMain: { flex: 1, minWidth: 0, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: palette.line, backgroundColor: 'white' },
  webWelcome: { borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 27, paddingBottom: 30, backgroundColor: 'white' },
  webAuthHeader: { backgroundColor: '#fff2bf', paddingBottom: 24 },
  webAuthForm: { flex: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 22 },
  yellow: { backgroundColor: '#ffbf13' },
  scroll: { flexGrow: 1, width: '100%', maxWidth: 535, alignSelf: 'center' },
  intro: { flex: 1, minHeight: 390, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  illustration: { width: '100%', height: 221, borderRadius: 22, backgroundColor: '#e8e1fc', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  brand: { fontSize: 48, fontWeight: '800', color: '#151512' },
  muted: { color: '#64645d', fontSize: 14 },
  welcomePanel: { backgroundColor: '#ffbf13', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingTop: 32, paddingBottom: 40, gap: 14 },
  header: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 39, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 23 },
  title: { fontSize: 36, fontWeight: '800', color: '#151512' },
  description: { fontSize: 15, lineHeight: 21, color: '#151512' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 15 },
  form: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 31, borderTopRightRadius: 31, padding: 28, paddingTop: 33, gap: 12 },
  input: { minHeight: 49, borderRadius: 25, backgroundColor: '#f2f3f1', paddingHorizontal: 18, color: '#151512', fontSize: 14 },
  school: { minHeight: 48, borderRadius: 20, backgroundColor: '#f2f3f1', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  schoolText: { flex: 1, color: '#35352e', fontSize: 13 },
  submit: { flexDirection: 'row', marginTop: 15 },
  button: { flex: 1, minHeight: 49, borderRadius: 25, backgroundColor: '#151512', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  light: { backgroundColor: '#fff' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  link: { color: '#151512', fontSize: 14, fontWeight: '700' },
  guest: { textAlign: 'center', fontSize: 13, color: '#151512', fontWeight: '600' },
});
