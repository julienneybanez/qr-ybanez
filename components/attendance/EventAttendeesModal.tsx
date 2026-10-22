import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { AttendanceStatus, EventAttendanceGroup, EventAttendee } from '@/lib/attendance';
import { formatHistoryDate } from '@/components/history/historyUtils';

type Filter = 'all' | AttendanceStatus;

type Props = {
  visible: boolean;
  group: EventAttendanceGroup | null;
  editable?: boolean;
  onClose: () => void;
  onCorrect?: (attendee: EventAttendee) => void;
  onExport: () => void;
};

export default function EventAttendeesModal({
  visible,
  group,
  editable = false,
  onClose,
  onCorrect,
  onExport,
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setFilter('all');
    }
  }, [visible]);

  const attendees = useMemo(() => {
    if (!group) return [];
    const needle = query.trim().toLowerCase();

    return group.attendees.filter((attendee) => {
      const matchesStatus = filter === 'all' || attendee.status === filter;
      const matchesSearch =
        !needle ||
        attendee.studentName?.toLowerCase().includes(needle) ||
        attendee.studentEmail?.toLowerCase().includes(needle) ||
        attendee.studentId?.toLowerCase().includes(needle);

      return matchesStatus && matchesSearch;
    });
  }, [group, query, filter]);

  if (!group) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.back}><Ionicons name="arrow-back" size={21} color="#FFFFFF" /></Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>{group.title}</Text>
            <Text style={styles.subtitle}>{group.eventCode} · {group.attendeeCount} attendee{group.attendeeCount === 1 ? '' : 's'}</Text>
          </View>
          <Pressable onPress={onExport} style={styles.export}><Ionicons name="download-outline" size={19} color="#FFFFFF" /></Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.summary}>
            <Summary label="Total" value={group.attendeeCount} color={COLORS.textPrimary} />
            <Summary label="Present" value={group.presentCount} color={COLORS.success} />
            <Summary label="Late" value={group.lateCount} color={COLORS.warning} />
            <Summary label="Excused" value={group.excusedCount} color={COLORS.primary} />
          </View>

          <View style={styles.eventMeta}>
            {group.venue ? <Text style={styles.eventMetaText}>{group.venue}</Text> : null}
            <Text style={styles.eventMetaText}>Late after {group.lateAfterMinutes} min</Text>
          </View>

          <View style={styles.search}>
            <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search student or Student ID"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.searchInput}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.filters}>
            {(['all', 'present', 'late', 'excused'] as Filter[]).map((value) => (
              <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                  {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <FlatList
            data={attendees}
            keyExtractor={(item) => item.attendanceId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={30} color={COLORS.primary} /><Text style={styles.emptyTitle}>No attendees found</Text><Text style={styles.emptyText}>Attendance records matching this filter will appear here.</Text></View>}
            renderItem={({ item }) => (
              <AttendeeRow
                attendee={item}
                editable={editable}
                onCorrect={() => onCorrect?.(item)}
              />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function AttendeeRow({ attendee, editable, onCorrect }: { attendee: EventAttendee; editable: boolean; onCorrect: () => void }) {
  const status = statusStyle(attendee.status);

  return (
    <View style={styles.attendee}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(attendee.studentName?.trim()?.[0] || '?').toUpperCase()}</Text></View>
      <View style={styles.attendeeBody}>
        <View style={styles.attendeeTop}>
          <Text style={styles.name}>{attendee.studentName || 'Unnamed student'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.background }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
        </View>
        <Text style={styles.studentId}>{attendee.studentId ? 'Student ID: ' + attendee.studentId : 'Student ID unavailable'}</Text>
        <Text style={styles.time}>{formatHistoryDate(attendee.scannedAt)}</Text>
        {editable ? <Pressable onPress={onCorrect} style={styles.correct}><Ionicons name="create-outline" size={14} color={COLORS.primary} /><Text style={styles.correctText}>Correct</Text></Pressable> : null}
      </View>
    </View>
  );
}

function statusStyle(status: AttendanceStatus) {
  if (status === 'late') return { label: 'Late', background: COLORS.warningSoft, color: COLORS.warning };
  if (status === 'excused') return { label: 'Excused', background: COLORS.primarySoft, color: COLORS.primary };
  return { label: 'Present', background: COLORS.successSoft, color: COLORS.success };
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:COLORS.background},
  header:{backgroundColor:COLORS.navy,paddingTop:54,paddingHorizontal:16,paddingBottom:17,flexDirection:'row',alignItems:'center',gap:11},
  back:{width:40,height:40,borderRadius:13,backgroundColor:'rgba(255,255,255,.1)',alignItems:'center',justifyContent:'center'},
  headerText:{flex:1},
  title:{color:'#FFFFFF',fontSize:17,fontWeight:'800'},
  subtitle:{marginTop:3,color:'#AEBAD6',fontSize:10.5},
  export:{width:40,height:40,borderRadius:13,backgroundColor:'rgba(255,255,255,.1)',alignItems:'center',justifyContent:'center'},
  body:{flex:1,paddingHorizontal:16,paddingTop:14},
  summary:{flexDirection:'row',backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:18,paddingVertical:13},
  summaryItem:{flex:1,alignItems:'center'},
  summaryValue:{fontSize:18,fontWeight:'900'},
  summaryLabel:{marginTop:2,fontSize:8.5,color:COLORS.textSecondary},
  eventMeta:{flexDirection:'row',justifyContent:'space-between',gap:10,marginTop:9},
  eventMetaText:{fontSize:9.5,color:COLORS.textSecondary,fontWeight:'600'},
  search:{minHeight:46,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,borderRadius:15,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,marginTop:12},
  searchInput:{flex:1,fontSize:12.5,color:COLORS.textPrimary},
  filters:{flexDirection:'row',gap:6,marginTop:9,marginBottom:10},
  filter:{flex:1,minHeight:34,borderRadius:999,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  filterActive:{backgroundColor:COLORS.primarySoft,borderColor:'#9DB0FF'},
  filterText:{fontSize:9.5,fontWeight:'700',color:COLORS.textSecondary},
  filterTextActive:{color:COLORS.primary},
  list:{paddingBottom:30},
  attendee:{flexDirection:'row',gap:10,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:17,padding:12,marginBottom:9},
  avatar:{width:40,height:40,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  avatarText:{fontSize:13,fontWeight:'900',color:COLORS.primary},
  attendeeBody:{flex:1},
  attendeeTop:{flexDirection:'row',alignItems:'center',gap:7},
  name:{flex:1,fontSize:12.5,fontWeight:'800',color:COLORS.textPrimary},
  statusBadge:{borderRadius:999,paddingHorizontal:7,paddingVertical:4},
  statusText:{fontSize:8.5,fontWeight:'800'},
  studentId:{marginTop:3,fontSize:10,fontWeight:'700',color:COLORS.primary},
  time:{marginTop:3,fontSize:9.5,color:COLORS.textSecondary},
  correct:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:4,marginTop:7,borderRadius:999,backgroundColor:COLORS.primarySoft,paddingHorizontal:9,paddingVertical:6},
  correctText:{fontSize:9.5,fontWeight:'800',color:COLORS.primary},
  empty:{minHeight:220,alignItems:'center',justifyContent:'center',paddingHorizontal:24},
  emptyTitle:{marginTop:10,fontSize:14,fontWeight:'800',color:COLORS.textPrimary},
  emptyText:{marginTop:4,fontSize:10.5,lineHeight:16,color:COLORS.textSecondary,textAlign:'center'},
});
