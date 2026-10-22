import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { EventAttendanceGroup } from '@/lib/attendance';
import { formatHistoryDate } from '@/components/history/historyUtils';

type Props = {
  item: EventAttendanceGroup;
  creatorName?: string | null;
  onPress: () => void;
  onExport: () => void;
};

export default function EventAttendanceCard({ item, creatorName, onPress, onExport }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}><Ionicons name="calendar-outline" size={21} color={COLORS.primary} /></View>
        <View style={styles.heading}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.code}>{item.eventCode}</Text>
        </View>
        <View style={styles.statusBadge}><Text style={styles.statusText}>{item.displayStatus}</Text></View>
      </View>

      {creatorName ? <Meta icon="person-outline" text={creatorName} /> : null}
      {item.startTime ? <Meta icon="time-outline" text={formatHistoryDate(item.startTime)} /> : null}
      {item.venue ? <Meta icon="location-outline" text={item.venue} /> : null}

      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalValue}>{item.attendeeCount}</Text>
          <Text style={styles.totalLabel}>Attendees</Text>
        </View>
        <View style={styles.summary}>
          <Summary value={item.presentCount} label="Present" color={COLORS.success} />
          <Summary value={item.lateCount} label="Late" color={COLORS.warning} />
          <Summary value={item.excusedCount} label="Excused" color={COLORS.primary} />
        </View>
      </View>

      {item.firstCheckIn || item.lastCheckIn ? (
        <View style={styles.checkTimes}>
          <Text style={styles.checkText}>
            First: {item.firstCheckIn ? new Date(item.firstCheckIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
          </Text>
          <Text style={styles.checkText}>
            Latest: {item.lastCheckIn ? new Date(item.lastCheckIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
          <Ionicons name="people-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryText}>View Attendees</Text>
        </Pressable>
        <Pressable onPress={onExport} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
          <Ionicons name="download-outline" size={16} color={COLORS.primary} />
          <Text style={styles.secondaryText}>CSV</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.meta}><Ionicons name={icon} size={14} color={COLORS.textSecondary} /><Text style={styles.metaText}>{text}</Text></View>;
}

function Summary({ value, label, color }: { value: number; label: string; color: string }) {
  return <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:20,padding:14,marginBottom:11},
  header:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:5},
  icon:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  heading:{flex:1,minWidth:0},
  title:{fontSize:14,fontWeight:'800',color:COLORS.textPrimary},
  code:{marginTop:3,fontSize:10,fontWeight:'700',color:COLORS.primary},
  statusBadge:{borderRadius:999,backgroundColor:COLORS.primarySoft,paddingHorizontal:8,paddingVertical:5},
  statusText:{fontSize:9,fontWeight:'800',color:COLORS.primary},
  meta:{flexDirection:'row',alignItems:'center',gap:6,marginTop:7},
  metaText:{flex:1,fontSize:10.5,color:COLORS.textSecondary},
  totalRow:{flexDirection:'row',alignItems:'center',marginTop:13,paddingTop:12,borderTopWidth:1,borderTopColor:COLORS.border},
  totalValue:{fontSize:24,fontWeight:'900',color:COLORS.textPrimary},
  totalLabel:{fontSize:9.5,color:COLORS.textSecondary,fontWeight:'600'},
  summary:{flex:1,flexDirection:'row',marginLeft:18},
  summaryItem:{flex:1,alignItems:'center'},
  summaryValue:{fontSize:14,fontWeight:'900'},
  summaryLabel:{marginTop:2,fontSize:8.5,color:COLORS.textSecondary},
  checkTimes:{flexDirection:'row',justifyContent:'space-between',gap:8,marginTop:10,backgroundColor:COLORS.surface,borderRadius:12,paddingHorizontal:10,paddingVertical:8},
  checkText:{fontSize:9.5,color:COLORS.textSecondary,fontWeight:'600'},
  actions:{flexDirection:'row',gap:8,marginTop:12},
  primaryAction:{flex:1,minHeight:39,borderRadius:13,backgroundColor:COLORS.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  primaryText:{fontSize:10.5,fontWeight:'800',color:'#FFFFFF'},
  secondaryAction:{minWidth:76,minHeight:39,borderRadius:13,backgroundColor:COLORS.primarySoft,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
  secondaryText:{fontSize:10.5,fontWeight:'800',color:COLORS.primary},
  pressed:{opacity:.78},
});
