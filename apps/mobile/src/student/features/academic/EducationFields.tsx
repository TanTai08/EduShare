import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  academicRegions, type AcademicMajor, type AcademicSchool, type EducationSelection,
} from '../../../../../../packages/contracts';
import { requestApi } from '../../../services/api';

export type EducationDraft = EducationSelection & { region: string };
export const emptyEducation: EducationDraft = { region: '', schoolId: '' };

function useCatalog<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{ path: string; attempt: number; rows?: T[]; error?: boolean }>();
  useEffect(() => {
    if (!path) return;
    let active = true;
    void requestApi<T[]>(path).then(rows => {
      if (active) setResponse({ path, attempt, rows });
    }).catch(() => {
      if (active) setResponse({ path, attempt, error: true });
    });
    return () => { active = false; };
  }, [path, attempt]);
  const current = response?.path === path && response.attempt === attempt ? response : undefined;
  return { rows: current?.rows ?? [], loading: !!path && !current, error: current?.error, retry: () => setAttempt(value => value + 1) };
}

export function EducationFields({ value, change }: { value: EducationDraft; change: (value: EducationDraft) => void }) {
  const schools = useCatalog<AcademicSchool>(value.region ? '/schools?region=' + encodeURIComponent(value.region) : '');
  const majors = useCatalog<AcademicMajor>(value.schoolId ? '/schools/' + encodeURIComponent(value.schoolId) + '/majors' : '');
  const options = majors.rows.find(item => item.id === value.majorId)?.specializations ?? [];
  return <View style={s.fields}>
    <Choice label="Khu vực" items={academicRegions} value={value.region}
      choose={region => { if (region !== value.region) change({ region, schoolId: '' }); }} />
    <Choice label="Trường / cơ sở" items={schools.rows} value={value.schoolId} disabled={!value.region || !schools.rows.length}
      choose={schoolId => { if (schoolId !== value.schoolId) change({ region: value.region, schoolId }); }} />
    <CatalogStatus label="danh sách trường" {...schools} />
    <Choice label="Ngành học" items={majors.rows} value={value.majorId} disabled={!value.schoolId || !majors.rows.length}
      choose={majorId => { if (majorId !== value.majorId) change({ region: value.region, schoolId: value.schoolId, majorId }); }} />
    <CatalogStatus label="danh sách ngành" {...majors} />
    {!!value.schoolId && !majors.loading && !majors.error && !majors.rows.length &&
      <Text style={s.hint}>Danh mục ngành của trường này chưa có. Bạn có thể bổ sung sau.</Text>}
    {!!options.length && <Choice label="Chuyên ngành (nếu có)" items={options} value={value.specializationId}
      clearable choose={specializationId => change({ ...value, specializationId: specializationId || undefined })} />}
  </View>;
}

function CatalogStatus({ label, loading, error, retry }: { label: string; loading: boolean; error?: boolean; retry: () => void }) {
  if (loading) return <Text style={s.hint}>Đang tải {label}…</Text>;
  if (!error) return null;
  return <Pressable accessibilityRole="button" onPress={retry}>
    <Text style={s.error}>Không tải được {label}. Thử lại</Text>
  </Pressable>;
}

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');

function Choice({ label, items, value, choose, disabled, clearable }: {
  label: string; items: readonly { id: string; name: string }[]; value?: string; choose: (id: string) => void;
  disabled?: boolean; clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (disabled) { setOpen(false); setQuery(''); }
  }, [disabled]);
  const matches = items.filter(item => normalize(item.name).includes(normalize(query.trim())));
  function pick(id: string) {
    choose(id);
    setOpen(false);
    setQuery('');
  }
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open, disabled }}
      disabled={disabled} onPress={() => { setOpen(active => !active); setQuery(''); }} style={[s.trigger, disabled && s.disabled]}>
      <Text style={s.text}>{items.find(item => item.id === value)?.name || 'Chọn ' + label.toLowerCase()}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color="#30465a" />
    </Pressable>
    {open && !disabled && <View style={s.options}>
      {items.length > 8 && <TextInput accessibilityLabel={'Tìm ' + label.toLowerCase()} placeholder={'Tìm ' + label.toLowerCase()}
        value={query} onChangeText={setQuery} style={s.search} />}
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={s.optionList}>
      {clearable && <Pressable accessibilityRole="button" onPress={() => pick('')} style={s.option}><Text style={s.hint}>Bỏ chọn chuyên ngành</Text></Pressable>}
      {matches.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: value === item.id }}
        onPress={() => pick(item.id)} style={s.option}><Text style={s.text}>{item.name}</Text>
        {item.id === value && <Ionicons name="checkmark" size={17} color="#30465a" />}
      </Pressable>)}
      {!matches.length && <Text style={s.option}>Không tìm thấy kết quả</Text>}
      </ScrollView>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  fields: { gap: 10 },
  field: { gap: 5 },
  label: { fontSize: 13, fontWeight: '700', color: '#203448' },
  hint: { fontSize: 12, color: '#526579' },
  error: { fontSize: 13, color: '#a72b29' },
  trigger: { minHeight: 46, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row',
    gap: 10, alignItems: 'center', backgroundColor: '#edf1f4' },
  disabled: { opacity: 0.55 },
  text: { flex: 1, fontSize: 14, color: '#203448' },
  options: { borderWidth: 1, borderColor: '#e0e6ec', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  optionList: { maxHeight: 246 },
  option: { minHeight: 42, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#edf1f4' },
  search: { margin: 8, paddingHorizontal: 10, minHeight: 38, borderRadius: 8, backgroundColor: '#f1f4f7', color: '#203448' },
});
