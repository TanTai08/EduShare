import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../ui';
import { styles } from '../../styles';
import {
  appointmentAt, appointmentTimestamp, formatAppointment, minuteMs, nextAppointment, pastAppointmentMessage,
  twoDigits, type Appointment,
} from '../../../../../../packages/contracts/appointment';
import { monthDays, shiftMonth, type CalendarMonth } from './appointment';

const week = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const hours = Array.from({ length: 24 }, (_, index) => index);
const minutes = Array.from({ length: 60 }, (_, index) => index);

export function AppointmentPicker({ value, onChange }: { value: Appointment | null; onChange: (value: Appointment) => void }) {
  const [draft, setDraft] = useState<Appointment | null>(null);
  const [month, setMonth] = useState<CalendarMonth>(() => appointmentAt(Date.now()));
  const [clock, setClock] = useState(Date.now);
  const isOpen = draft !== null;
  const today = appointmentAt(clock);
  const canGoBack = month.year * 12 + month.month > today.year * 12 + today.month;
  const expired = draft !== null && appointmentTimestamp(draft) <= clock;
  const close = () => setDraft(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setClock(current => {
      const now = Date.now();
      return Math.floor(now / minuteMs) === Math.floor(current / minuteMs) ? current : now;
    }), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  function open() {
    const now = Date.now();
    const initial = value && appointmentTimestamp(value) > now ? value : nextAppointment(now);
    setClock(now);
    setMonth({ year: initial.year, month: initial.month });
    setDraft(initial);
  }

  function selectDay(day: number) {
    if (!draft) return;
    const now = Date.now();
    const date = { ...draft, ...month, day };
    setClock(now);
    if (appointmentTimestamp({ ...date, hour: 23, minute: 59 }) <= now) return;
    setDraft(appointmentTimestamp(date) > now ? date : nextAppointment(now));
  }

  function selectHour(hour: number) {
    if (!draft) return;
    const now = Date.now();
    const time = { ...draft, hour };
    setClock(now);
    if (appointmentTimestamp({ ...time, minute: 59 }) <= now) return;
    setDraft(appointmentTimestamp(time) > now ? time : nextAppointment(now));
  }

  function selectMinute(minute: number) {
    if (!draft) return;
    const now = Date.now();
    const time = { ...draft, minute };
    setClock(now);
    if (appointmentTimestamp(time) > now) setDraft(time);
  }

  function confirm() {
    if (!draft) return;
    const now = Date.now();
    if (appointmentTimestamp(draft) <= now) {
      setClock(now);
      return;
    }
    onChange(draft);
    close();
  }

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Chọn ngày và giờ hẹn"
      accessibilityValue={value ? { text: formatAppointment(value) } : undefined} onPress={open}
      style={[styles.field, s.trigger]}>
      <View style={styles.flex}>
        <Text style={styles.small}>Ngày và giờ hẹn</Text>
        <Text style={s.value}>{value ? formatAppointment(value) : 'Chọn ngày và giờ'}</Text>
      </View>
      <View style={s.calendarIcon}><Ionicons name="calendar-outline" size={23} color="#203448" /></View>
    </Pressable>
    {draft && <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.dialog} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={s.content}>
            <View style={styles.row}>
              <Text accessibilityRole="header" style={[styles.heading, styles.flex]}>Chọn ngày và giờ hẹn</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng bộ chọn lịch" onPress={close} style={s.iconButton}>
                <Ionicons name="close" size={22} color="#203448" />
              </Pressable>
            </View>
            <View style={s.monthHeader}>
              <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước"
                disabled={!canGoBack} onPress={() => setMonth(current => shiftMonth(current, -1))}
                style={[s.iconButton, !canGoBack && s.disabled]}>
                <Ionicons name="chevron-back" size={20} color="#203448" />
              </Pressable>
              <Text accessibilityLiveRegion="polite" style={styles.bold}>Tháng {month.month + 1}/{month.year}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau"
                onPress={() => setMonth(current => shiftMonth(current, 1))} style={s.iconButton}>
                <Ionicons name="chevron-forward" size={20} color="#203448" />
              </Pressable>
            </View>
            <View style={s.grid}>
              {week.map(label => <View key={label} style={s.cell}><Text style={styles.small}>{label}</Text></View>)}
              {monthDays(month).map((day, index) => {
                if (day === null) return <View key={'empty-' + index} style={s.cell} />;
                const disabled = appointmentTimestamp({ ...month, day, hour: 23, minute: 59 }) <= clock;
                const selected = !disabled && day === draft.day && month.month === draft.month && month.year === draft.year;
                return <View key={day} style={s.cell}>
                  <Pressable accessibilityRole="button" accessibilityLabel={day + '/' + (month.month + 1) + '/' + month.year}
                    accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => selectDay(day)}
                    style={[s.day, selected && s.selected, disabled && s.disabled]}>
                    <Text style={styles.bold}>{day}</Text>
                  </Pressable>
                </View>;
              })}
            </View>
            <View style={s.timeRow}>
              <TimeOptions label="Giờ" options={hours} value={draft.hour}
                disabled={hour => appointmentTimestamp({ ...draft, hour, minute: 59 }) <= clock} onChange={selectHour} />
              <TimeOptions label="Phút" options={minutes} value={draft.minute}
                disabled={minute => appointmentTimestamp({ ...draft, minute }) <= clock} onChange={selectMinute} />
            </View>
            <Text accessibilityLiveRegion="polite" style={s.summary}>{formatAppointment(draft)} (giờ Việt Nam)</Text>
            {expired && <Text accessibilityRole="alert" style={styles.notice}>{pastAppointmentMessage}</Text>}
            <Button caption="Xác nhận ngày giờ" disabled={expired} onPress={confirm} />
          </ScrollView>
        </View>
      </View>
    </Modal>}
  </>;
}

function TimeOptions({ label, options, value, disabled, onChange }: {
  label: string; options: number[]; value: number; disabled: (value: number) => boolean; onChange: (value: number) => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const initialRow = useRef(Math.floor(value / 3));
  return <View style={styles.flex}>
    <Text style={styles.small}>{label} · {twoDigits(value)}</Text>
    <ScrollView ref={scroll} nestedScrollEnabled style={s.timeOptions} contentContainerStyle={s.grid}
      onLayout={() => scroll.current?.scrollTo({ y: Math.max(0, initialRow.current - 1) * 36, animated: false })}>
      {options.map(number => {
        const unavailable = disabled(number);
        const selected = !unavailable && value === number;
        return <View key={number} style={s.timeCell}>
          <Pressable accessibilityRole="button" accessibilityLabel={label + ' ' + twoDigits(number)}
            accessibilityState={{ selected, disabled: unavailable }} disabled={unavailable} onPress={() => onChange(number)}
            style={[s.timeButton, selected && s.selected, unavailable && s.disabled]}>
            <Text style={styles.bold}>{twoDigits(number)}</Text>
          </Pressable>
        </View>;
      })}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  trigger: { minHeight: 66, paddingHorizontal: 13, flexDirection: 'row', gap: 10, alignItems: 'center' },
  value: { color: '#172a41', marginTop: 4, fontSize: 16 },
  calendarIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1b8', borderRadius: 12 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14, backgroundColor: '#14223099' },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '95%', borderRadius: 18, backgroundColor: '#fff', overflow: 'hidden' },
  content: { padding: 16, gap: 10 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#edf1f6', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  day: { width: '94%', minHeight: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#ffcd16' },
  disabled: { opacity: 0.35 },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeOptions: { marginTop: 6, height: 108, flexGrow: 0 },
  timeCell: { width: '33.33%', padding: 2 },
  timeButton: { height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#edf1f6', borderRadius: 9 },
  summary: { textAlign: 'center', color: '#526579', fontSize: 13 },
});
