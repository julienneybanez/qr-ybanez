import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { AttendanceRecord,AttendanceStatus } from '@/lib/attendance';
import { formatHistoryDate } from './historyUtils';

type Props={item:AttendanceRecord;onReport?:()=>void};

function statusStyle(status:AttendanceStatus){
  if(status==='late')return{label:'Late',background:COLORS.warningSoft,color:COLORS.warning};
  if(status==='excused')return{label:'Excused',background:COLORS.primarySoft,color:COLORS.primary};
  return{label:'Present',background:COLORS.successSoft,color:COLORS.success};
}

export default function StudentHistoryCard({item,onReport}:Props){
  const status=statusStyle(item.status);
  return <View style={styles.card}>
    <View style={[styles.eventIcon,{backgroundColor:status.background}]}><Ionicons name={item.status==='late'?'time-outline':item.status==='excused'?'information-circle-outline':'checkmark-circle-outline'} size={22} color={status.color}/></View>
    <View style={styles.body}>
      <View style={styles.top}>
        <View style={styles.heading}><Text style={styles.title}>{item.eventTitle}</Text><Text style={styles.code}>Code: {item.eventId}</Text></View>
        <View style={[styles.badge,{backgroundColor:status.background}]}><Text style={[styles.badgeText,{color:status.color}]}>{status.label}</Text></View>
      </View>
      <View style={styles.meta}><Ionicons name="time-outline" size={15} color={COLORS.textSecondary}/><Text style={styles.metaText}>{formatHistoryDate(item.scannedAt)}</Text></View>
      {onReport?<Pressable onPress={onReport} style={styles.report}><Ionicons name="flag-outline" size={13} color={COLORS.primary}/><Text style={styles.reportText}>Report an Issue</Text></Pressable>:null}
    </View>
  </View>;
}

const styles=StyleSheet.create({
  card:{backgroundColor:'#fff',borderRadius:20,borderWidth:1,borderColor:COLORS.border,padding:14,marginBottom:11,flexDirection:'row',gap:11,shadowColor:COLORS.shadow,shadowOpacity:.03,shadowRadius:10,elevation:1},
  eventIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},
  body:{flex:1,minWidth:0},
  top:{flexDirection:'row',alignItems:'flex-start'},
  heading:{flex:1,minWidth:0},
  title:{fontSize:15,fontWeight:'800',color:COLORS.textPrimary},
  code:{marginTop:3,fontSize:10.5,fontWeight:'700',color:COLORS.primary},
  badge:{borderRadius:999,paddingHorizontal:9,paddingVertical:5,marginLeft:8},
  badgeText:{fontSize:9.5,fontWeight:'800'},
  meta:{flexDirection:'row',alignItems:'center',marginTop:9,gap:6},
  metaText:{fontSize:11,color:COLORS.textSecondary},
  report:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5,marginTop:8,paddingVertical:5},
  reportText:{fontSize:10,fontWeight:'800',color:COLORS.primary},
});
