import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet,Text,View } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { AttendanceStatus,TeacherEventAttendance } from '@/lib/attendance';
import { formatHistoryDate,shortProfileId } from './historyUtils';

type Props={item:TeacherEventAttendance};

function StatusBadge({status}:{status:AttendanceStatus}){
  const late=status==='late';
  const excused=status==='excused';
  const background=late?COLORS.warningSoft:excused?COLORS.primarySoft:COLORS.successSoft;
  const color=late?COLORS.warning:excused?COLORS.primary:COLORS.success;
  const label=status.charAt(0).toUpperCase()+status.slice(1);
  return <View style={[styles.statusBadge,{backgroundColor:background}]}><Text style={[styles.statusText,{color}]}>{label}</Text></View>;
}

export default function TeacherAttendanceCard({item}:Props){
  return <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.eventIcon}><Ionicons name="calendar-outline" size={21} color={COLORS.primary}/></View>
      <View style={styles.cardHeaderText}><Text style={styles.eventTitle}>{item.title}</Text><Text style={styles.eventCode}>Code: {item.eventCode}</Text></View>
      <View style={styles.countBadge}><Text style={styles.countNumber}>{item.attendeeCount}</Text><Text style={styles.countLabel}>attendees</Text></View>
    </View>
    {item.startTime?<View style={styles.metaRow}><Ionicons name="time-outline" size={15} color={COLORS.textSecondary}/><Text style={styles.metaText}>{formatHistoryDate(item.startTime)}</Text></View>:null}
    {item.attendees.length===0?<Text style={styles.attendeeEmpty}>No attendees yet.</Text>:<View style={styles.attendeeList}>{item.attendees.map(attendee=><View key={attendee.profileId} style={styles.attendeeRow}>
      <View style={styles.attendeeAvatar}><Text style={styles.attendeeAvatarText}>{(attendee.studentName?.trim()?.[0]??'?').toUpperCase()}</Text></View>
      <View style={styles.attendeeInfo}>
        <View style={styles.attendeeTop}><Text style={styles.attendeeName}>{attendee.studentName||shortProfileId(attendee.profileId)}</Text><StatusBadge status={attendee.status}/></View>
        <Text style={styles.studentIdText}>{attendee.studentId?'Student ID: '+attendee.studentId:'Student ID unavailable'}</Text>
        <Text style={styles.metaText}>{formatHistoryDate(attendee.scannedAt)}</Text>
      </View>
    </View>)}</View>}
  </View>;
}

const styles=StyleSheet.create({
  card:{backgroundColor:'#fff',borderRadius:20,borderWidth:1,borderColor:COLORS.border,padding:14,marginBottom:11,shadowColor:COLORS.shadow,shadowOpacity:.03,shadowRadius:10,elevation:1},
  cardHeader:{flexDirection:'row',alignItems:'center'},
  eventIcon:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center',marginRight:11},
  cardHeaderText:{flex:1,minWidth:0},
  eventTitle:{fontSize:15,fontWeight:'800',color:COLORS.textPrimary},
  eventCode:{marginTop:3,fontSize:10.5,fontWeight:'700',color:COLORS.primary},
  countBadge:{alignItems:'center',backgroundColor:COLORS.primarySoft,borderRadius:13,paddingHorizontal:9,paddingVertical:6,marginLeft:8},
  countNumber:{color:COLORS.primary,fontSize:15,fontWeight:'800'},
  countLabel:{color:COLORS.textSecondary,fontSize:8.5,marginTop:1},
  metaRow:{flexDirection:'row',alignItems:'center',marginTop:11,gap:6},
  metaText:{fontSize:10.5,color:COLORS.textSecondary},
  attendeeList:{marginTop:13,borderTopWidth:1,borderTopColor:COLORS.border},
  attendeeRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:COLORS.border},
  attendeeAvatar:{width:35,height:35,borderRadius:18,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center',marginRight:10},
  attendeeAvatarText:{color:COLORS.primary,fontWeight:'800',fontSize:12},
  attendeeInfo:{flex:1},
  attendeeTop:{flexDirection:'row',alignItems:'center',gap:8},
  attendeeName:{flex:1,fontSize:13,fontWeight:'700',color:COLORS.textPrimary,marginBottom:2},
  studentIdText:{fontSize:10.5,fontWeight:'700',color:COLORS.primary,marginBottom:2},
  attendeeEmpty:{marginTop:13,fontSize:12,color:COLORS.textSecondary},
  statusBadge:{borderRadius:999,paddingHorizontal:7,paddingVertical:4},
  statusText:{fontSize:8.5,fontWeight:'800'},
});
