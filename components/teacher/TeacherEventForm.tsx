import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import type { CloudEvent } from '@/lib/events';

import { formatDateTime } from './formatDateTime';

export type EditTarget = 'start' | 'end';
export type MessageType = 'success' | 'error';

const QUICK_END_OPTIONS = [
  {
    label: '+30 min',
    ms: 30 * 60 * 1000,
  },
  {
    label: '+1 hour',
    ms: 60 * 60 * 1000,
  },
  {
    label: '+2 hours',
    ms: 2 * 60 * 60 * 1000,
  },
];

type Props = {
  editingEvent: CloudEvent | null;
  title: string;
  eventId: string;
  venue: string;
  description: string;
  startDate: Date;
  endDate: Date;
  editTarget: EditTarget | null;
  editingPart: 'date' | 'time';
  isAndroid: boolean;
  saving: boolean;
  message: string | null;
  messageType: MessageType;
  onTitleChange: (value: string) => void;
  onEventIdChange: (value: string) => void;
  onVenueChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onOpenPicker: (target: EditTarget) => void;
  onPickerChange: (
    event: DateTimePickerEvent,
    selected?: Date
  ) => void;
  onQuickEnd: (ms: number) => void;
  onSave: () => void;
  onCancel: () => void;
};

export default function TeacherEventForm({
  editingEvent,
  title,
  eventId,
  venue,
  description,
  startDate,
  endDate,
  editTarget,
  editingPart,
  isAndroid,
  saving,
  message,
  messageType,
  onTitleChange,
  onEventIdChange,
  onVenueChange,
  onDescriptionChange,
  onOpenPicker,
  onPickerChange,
  onQuickEnd,
  onSave,
  onCancel,
}: Props) {
  return (
    <>
      <Text style={styles.title}>
        {editingEvent
          ? 'Edit Event'
          : 'Create Event'}
      </Text>

      <Text style={styles.subtitle}>
        {editingEvent
          ? 'Update the event details below.'
          : 'Create an event and generate its attendance QR code.'}
      </Text>

      <Text style={styles.sectionLabel}>
        Event details
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Event title
        </Text>

        <TextInput
          style={styles.input}
          value={title}
          onChangeText={onTitleChange}
          placeholder="e.g. Founders Day Assembly"
          placeholderTextColor={COLORS.textSecondary}
          editable={!saving}
        />

        <Text style={styles.label}>
          Event code
        </Text>

        <TextInput
          style={[
            styles.input,
            editingEvent && styles.inputDisabled,
          ]}
          value={eventId}
          onChangeText={onEventIdChange}
          placeholder="e.g. EVT-2026-0002"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="characters"
          editable={!editingEvent && !saving}
        />

        {editingEvent ? (
          <Text style={styles.fieldHint}>
            Event codes stay the same after creation so existing QR codes remain valid.
          </Text>
        ) : null}

        <Text style={styles.label}>
          Venue
        </Text>

        <TextInput
          style={styles.input}
          value={venue}
          onChangeText={onVenueChange}
          placeholder="e.g. School Gymnasium"
          placeholderTextColor={COLORS.textSecondary}
          editable={!saving}
        />

        <Text style={styles.label}>
          Description
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.multilineInput,
          ]}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="Add event details or instructions"
          placeholderTextColor={COLORS.textSecondary}
          multiline
          textAlignVertical="top"
          editable={!saving}
        />
      </View>

      <Text style={styles.sectionLabel}>
        Schedule
      </Text>

      <View style={styles.card}>
        <PickerField
          label="Starts"
          value={formatDateTime(startDate)}
          icon="sunny-outline"
          onPress={() =>
            onOpenPicker('start')
          }
        />

        <View style={styles.divider} />

        <PickerField
          label="Ends"
          value={formatDateTime(endDate)}
          icon="moon-outline"
          onPress={() =>
            onOpenPicker('end')
          }
        />

        <Text style={styles.quickLabel}>
          Duration
        </Text>

        <View style={styles.chipRow}>
          {QUICK_END_OPTIONS.map(
            (option) => (
              <Pressable
                key={option.label}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  onQuickEnd(option.ms)
                }
                disabled={saving}
              >
                <Text style={styles.chipText}>
                  {option.label}
                </Text>
              </Pressable>
            )
          )}
        </View>
      </View>

      {editTarget ? (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={
              editTarget === 'start'
                ? startDate
                : endDate
            }
            mode={
              isAndroid
                ? editingPart
                : 'datetime'
            }
            display={
              isAndroid
                ? 'default'
                : 'spinner'
            }
            onChange={onPickerChange}
          />
        </View>
      ) : null}

      {message ? (
        <View
          style={[
            styles.messageBox,
            messageType === 'success'
              ? styles.successBox
              : styles.errorBox,
          ]}
        >
          <Ionicons
            name={
              messageType === 'success'
                ? 'checkmark-circle-outline'
                : 'alert-circle-outline'
            }
            size={20}
            color={
              messageType === 'success'
                ? COLORS.success
                : COLORS.danger
            }
          />

          <Text
            style={[
              styles.messageText,
              {
                color:
                  messageType === 'success'
                    ? COLORS.success
                    : COLORS.danger,
              },
            ]}
          >
            {message}
          </Text>
        </View>
      ) : null}

      <AppButton
        theme="primary"
        title={
          saving
            ? 'Saving...'
            : editingEvent
              ? 'Save Changes'
              : 'Create Event'
        }
        icon={
          editingEvent
            ? 'save-outline'
            : 'add-circle-outline'
        }
        onPress={onSave}
        disabled={saving}
      />

      {editingEvent ? (
        <AppButton
          variant="secondary"
          title="Cancel Editing"
          icon="close-outline"
          onPress={onCancel}
          disabled={saving}
        />
      ) : null}
    </>
  );
}

type PickerFieldProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({
  label,
  value,
  icon,
  onPress,
}: PickerFieldProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.pickerIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.pickerText}>
        <Text style={styles.pickerLabel}>
          {label}
        </Text>

        <Text style={styles.pickerValue}>
          {value}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={18}
        color={COLORS.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 22,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  sectionLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  inputDisabled: {
    opacity: 0.65,
  },
  multilineInput: {
    minHeight: 92,
  },
  fieldHint: {
    marginTop: -8,
    marginBottom: 14,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  pickerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  pickerText: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
    marginLeft: 49,
  },
  quickLabel: {
    marginTop: 15,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pickerContainer: {
    marginTop: -8,
    marginBottom: 16,
    alignItems: 'center',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 12,
  },
  successBox: {
    backgroundColor: COLORS.successSoft,
  },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
