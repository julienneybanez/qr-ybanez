import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { getEventDisplayStatus, type CloudEvent } from '@/lib/events';
import { formatDateTime } from '@/components/teacher/formatDateTime';

type Props = {
  visible: boolean;
  event: CloudEvent | null;
  onClose: () => void;
  creatorName?: string | null;
  creatorEmail?: string | null;
  attendanceCount?: number;
};

export default function EventDetailsModal({
  visible,
  event,
  onClose,
  creatorName,
  creatorEmail,
  attendanceCount,
}: Props) {
  if (!event) return null;

  const status = getEventDisplayStatus(event);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.icon}>
              <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{event.title}</Text>
              <Text style={styles.code}>Code: {event.event_code}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={21} color={COLORS.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.statusRow}>
              <Text style={styles.sectionLabel}>Status</Text>
              <View style={styles.statusBadge}><Text style={styles.statusText}>{status}</Text></View>
            </View>

            <Detail icon="time-outline" label="Starts" value={event.start_time ? formatDateTime(new Date(event.start_time)) : 'Not set'} />
            <Detail icon="time-outline" label="Ends" value={event.end_time ? formatDateTime(new Date(event.end_time)) : 'Not set'} />
            <Detail icon="location-outline" label="Venue" value={event.venue || 'Not set'} />
            <Detail icon="timer-outline" label="Late threshold" value={`After ${event.late_after_minutes ?? 15} minutes`} />
            {creatorName || creatorEmail ? <Detail icon="person-outline" label="Created by" value={creatorName || creatorEmail || 'Unknown'} /> : null}
            {attendanceCount !== undefined ? <Detail icon="people-outline" label="Attendance" value={`${attendanceCount} recorded`} /> : null}

            <Text style={styles.sectionLabel}>Description</Text>
            <View style={styles.descriptionBox}>
              <Text style={styles.description}>{event.description || 'No description provided.'}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Detail({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles=StyleSheet.create({
  overlay:{flex:1,backgroundColor:COLORS.overlay,justifyContent:'flex-end'},
  sheet:{maxHeight:'84%',backgroundColor:COLORS.background,borderTopLeftRadius:28,borderTopRightRadius:28,paddingHorizontal:18,paddingBottom:24},
  handle:{alignSelf:'center',width:44,height:5,borderRadius:999,backgroundColor:'#D3D9E5',marginTop:10,marginBottom:12},
  header:{flexDirection:'row',alignItems:'center',gap:11,paddingBottom:14,borderBottomWidth:1,borderBottomColor:COLORS.border},
  icon:{width:44,height:44,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  headerText:{flex:1,minWidth:0},
  title:{fontSize:17,fontWeight:'800',color:COLORS.textPrimary},
  code:{marginTop:3,fontSize:10.5,fontWeight:'700',color:COLORS.primary},
  closeButton:{width:38,height:38,borderRadius:13,backgroundColor:COLORS.surface,alignItems:'center',justifyContent:'center'},
  content:{paddingTop:14,paddingBottom:10},
  statusRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},
  sectionLabel:{fontSize:10.5,fontWeight:'800',color:COLORS.textSecondary,textTransform:'uppercase',letterSpacing:.7,marginBottom:8},
  statusBadge:{borderRadius:999,backgroundColor:COLORS.primarySoft,paddingHorizontal:10,paddingVertical:6},
  statusText:{fontSize:10,fontWeight:'800',color:COLORS.primary},
  detailRow:{flexDirection:'row',alignItems:'center',gap:11,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:16,padding:12,marginBottom:9},
  detailIcon:{width:36,height:36,borderRadius:12,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  detailText:{flex:1},
  detailLabel:{fontSize:9.5,color:COLORS.textSecondary},
  detailValue:{marginTop:2,fontSize:12.5,fontWeight:'700',color:COLORS.textPrimary},
  descriptionBox:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:16,padding:13},
  description:{fontSize:12,lineHeight:18,color:COLORS.textSecondary},
});
