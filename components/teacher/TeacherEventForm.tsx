import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { CloudEvent } from '@/lib/events';

export type EditTarget = 'start' | 'end';
export type PickerPart = 'date' | 'time';
export type MessageType = 'success' | 'error';

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type Props = {
  editingEvent: CloudEvent | null;
  title: string;
  eventId: string;
  venue: string;
  description: string;
  startDate: Date;
  endDate: Date;
  lateAfterMinutes: number;
  editTarget: EditTarget | null;
  editingPart: PickerPart;
  isAndroid: boolean;
  saving: boolean;
  message: string | null;
  messageType: MessageType;
  onTitleChange: (value: string) => void;
  onEventIdChange: (value: string) => void;
  onVenueChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLateAfterMinutesChange: (minutes: number) => void;
  onOpenPicker: (target: EditTarget, part: PickerPart) => void;
  onPickerChange: (event: DateTimePickerEvent, selected?: Date) => void;
  onClosePicker: () => void;
  onQuickEnd: (durationMs: number) => void;
  onSave: () => void;
  onCancel: () => void;
};

export default function TeacherEventForm(p: Props) {
  const durationMs = p.endDate.getTime() - p.startDate.getTime();

  return (
    <>
      <View style={styles.pageHeader}>
        <View style={styles.glowLarge}/>
        <View style={styles.glowSmall}/>
        <Text style={styles.pageTitle}>Manage Events</Text>
      </View>

      <Text style={styles.formTitle}>{p.editingEvent ? 'Edit Event' : 'Create New Event'}</Text>

      <View style={styles.card}>
        <FieldLabel text="Event title"/>
        <TextInput style={styles.input} value={p.title} onChangeText={p.onTitleChange} placeholder="e.g. Founders Day Assembly" placeholderTextColor={COLORS.textSecondary} editable={!p.saving}/>
        <FieldLabel text="Event code"/>
        <TextInput style={[styles.input, p.editingEvent && styles.inputDisabled]} value={p.eventId} onChangeText={p.onEventIdChange} placeholder="e.g. EVT-2026-0002" placeholderTextColor={COLORS.textSecondary} autoCapitalize="characters" editable={!p.editingEvent && !p.saving}/>
        {p.editingEvent ? <Text style={styles.hint}>Event codes cannot be changed after creation.</Text> : null}
        <FieldLabel text="Venue"/>
        <TextInput style={styles.input} value={p.venue} onChangeText={p.onVenueChange} placeholder="e.g. School Gymnasium" placeholderTextColor={COLORS.textSecondary} editable={!p.saving}/>
        <FieldLabel text="Description"/>
        <TextInput style={[styles.input, styles.multiline]} value={p.description} onChangeText={p.onDescriptionChange} placeholder="Add event details or instructions" placeholderTextColor={COLORS.textSecondary} multiline textAlignVertical="top" editable={!p.saving}/>

        <View style={styles.scheduleRow}>
          <ScheduleField
            label="Starts"
            value={p.startDate}
            disabled={p.saving}
            onDatePress={() => p.onOpenPicker('start', 'date')}
            onTimePress={() => p.onOpenPicker('start', 'time')}
          />
          <ScheduleField
            label="Ends"
            value={p.endDate}
            disabled={p.saving}
            onDatePress={() => p.onOpenPicker('end', 'date')}
            onTimePress={() => p.onOpenPicker('end', 'time')}
          />
        </View>

        <Text style={styles.quickLabel}>Duration</Text>
        <View style={styles.chipRow}>
          {QUICK_END_OPTIONS.map(option => {
            const selected = Math.abs(durationMs - option.ms) < 60000;
            return (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: p.saving }}
                disabled={p.saving}
                onPress={() => p.onQuickEnd(option.ms)}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && !p.saving && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.quickLabel}>Mark Late After</Text>
        <Text style={styles.lateHint}>Students scanning after this many minutes from the event start are marked Late.</Text>
        <View style={styles.chipRow}>
          {[5, 10, 15, 30].map(minutes => {
            const selected = p.lateAfterMinutes === minutes;
            return (
              <Pressable
                key={minutes}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: p.saving }}
                disabled={p.saving}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && !p.saving && styles.pressed,
                ]}
                onPress={() => p.onLateAfterMinutesChange(minutes)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{minutes} min</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {p.editTarget ? p.isAndroid ? (
        <DateTimePicker
          key={p.editTarget + '-' + p.editingPart}
          value={p.editTarget === 'start' ? p.startDate : p.endDate}
          mode={p.editingPart}
          display="default"
          onChange={p.onPickerChange}
        />
      ) : (
        <View style={styles.pickerContainer}>
          <View style={styles.pickerTopRow}>
            <Text style={styles.pickerTitle}>
              {p.editTarget === 'start' ? 'Start' : 'End'} {p.editingPart === 'date' ? 'Date' : 'Time'}
            </Text>
            <Pressable accessibilityRole="button" onPress={p.onClosePicker} style={styles.pickerDone}>
              <Text style={styles.pickerDoneText}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={p.editTarget === 'start' ? p.startDate : p.endDate}
            mode={p.editingPart}
            display="spinner"
            onChange={p.onPickerChange}
          />
        </View>
      ) : null}

      {p.message ? (
        <View style={[styles.messageBox, p.messageType === 'success' ? styles.successBox : styles.errorBox]}>
          <Ionicons
            name={p.messageType === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
            size={20}
            color={p.messageType === 'success' ? COLORS.success : COLORS.danger}
          />
          <Text style={[styles.messageText, { color: p.messageType === 'success' ? COLORS.success : COLORS.danger }]}>
            {p.message}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={p.saving ? 'Saving event' : p.editingEvent ? 'Save Changes' : 'Create Event'}
        accessibilityState={{ disabled: p.saving, busy: p.saving }}
        disabled={p.saving}
        onPress={p.onSave}
        style={({ pressed }) => [styles.saveButton, pressed && !p.saving && styles.savePressed]}
      >
        {p.saving ? (
          <ActivityIndicator size="small" color="#FFFFFF"/>
        ) : (
          <Ionicons name={p.editingEvent ? 'save-outline' : 'add-circle-outline'} size={20} color="#FFFFFF"/>
        )}
        <Text style={styles.saveButtonText}>
          {p.saving ? 'Saving event...' : p.editingEvent ? 'Save Changes' : 'Create Event'}
        </Text>
      </Pressable>

      {p.editingEvent ? (
        <Pressable accessibilityRole="button" onPress={p.onCancel} disabled={p.saving} style={styles.cancelButton}>
          <Ionicons name="close-outline" size={18} color={COLORS.primary}/>
          <Text style={styles.cancelButtonText}>Cancel Editing</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function ScheduleField({
  label, value, disabled, onDatePress, onTimePress,
}: {
  label: string;
  value: Date;
  disabled: boolean;
  onDatePress: () => void;
  onTimePress: () => void;
}) {
  const dateLabel = value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeLabel = value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.scheduleCard}>
      <Text style={styles.scheduleTitle}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Choose ' + label.toLowerCase() + ' date'}
        disabled={disabled}
        onPress={onDatePress}
        style={({ pressed }) => [styles.scheduleControl, pressed && !disabled && styles.schedulePressed]}
      >
        <Ionicons name="calendar-outline" size={16} color={COLORS.primary}/>
        <View style={styles.scheduleCopy}>
          <Text style={styles.scheduleCaption}>Date</Text>
          <Text style={styles.scheduleValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{dateLabel}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Choose ' + label.toLowerCase() + ' time'}
        disabled={disabled}
        onPress={onTimePress}
        style={({ pressed }) => [styles.scheduleControl, pressed && !disabled && styles.schedulePressed]}
      >
        <Ionicons name="time-outline" size={16} color={COLORS.primary}/>
        <View style={styles.scheduleCopy}>
          <Text style={styles.scheduleCaption}>Time</Text>
          <Text style={styles.scheduleValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{timeLabel}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { backgroundColor: COLORS.navy, marginHorizontal: -20, marginTop: -12, marginBottom: 16, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, overflow: 'hidden' },
  glowLarge: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#2148CC', right: -82, bottom: -92 },
  glowSmall: { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: '#3566F5', right: 26, bottom: -60, opacity: 0.62 },
  pageTitle: { color: '#fff', fontSize: 21, fontWeight: '800', letterSpacing: -0.35 },
  formTitle: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 14, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', color: '#59647F', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFD', borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: COLORS.textPrimary, marginBottom: 12 },
  inputDisabled: { opacity: 0.65 },
  multiline: { minHeight: 78 },
  hint: { marginTop: -7, marginBottom: 12, fontSize: 10, lineHeight: 15, color: COLORS.textSecondary },
  scheduleRow: { flexDirection: 'row', gap: 8 },
  scheduleCard: { flex: 1, minWidth: 0, backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 9, gap: 8 },
  scheduleTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  scheduleControl: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFFFFF', borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 8, minHeight: 47 },
  schedulePressed: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  scheduleCopy: { flex: 1, minWidth: 0 },
  scheduleCaption: { fontSize: 9, color: COLORS.textSecondary },
  scheduleValue: { marginTop: 2, fontSize: 10.5, fontWeight: '800', color: COLORS.textPrimary },
  quickLabel: { marginTop: 14, marginBottom: 8, fontSize: 11, fontWeight: '800', color: COLORS.textSecondary },
  chipRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  chip: { backgroundColor: COLORS.primarySoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'transparent' },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  chipTextSelected: { color: '#FFFFFF' },
  lateHint: { marginTop: -3, marginBottom: 8, fontSize: 10, lineHeight: 15, color: COLORS.textSecondary },
  pickerContainer: { backgroundColor: COLORS.card, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, padding: 12 },
  pickerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerTitle: { fontWeight: '800', fontSize: 12, color: COLORS.textPrimary },
  pickerDone: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  pickerDoneText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  messageBox: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 12 },
  successBox: { backgroundColor: COLORS.successSoft },
  errorBox: { backgroundColor: COLORS.dangerSoft },
  messageText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  saveButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: COLORS.primary, borderRadius: 17, marginBottom: 12 },
  savePressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  cancelButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, marginBottom: 12 },
  cancelButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  pressed: { opacity: 0.8 },
});
