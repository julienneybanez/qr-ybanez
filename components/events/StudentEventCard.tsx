import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet,Text,View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { getEventDisplayStatus,type CloudEvent } from '@/lib/events';

type Props={event:CloudEvent};

export default function StudentEventCard({event}:Props){
  const status=getEventDisplayStatus(event);
  const badgeStyle=status==='Ongoing'?styles.ongoingBadge:status==='Upcoming'?styles.upcomingBadge:styles.endedBadge;
  const badgeTextColor=status==='Ongoing'?COLORS.success:status==='Upcoming'?COLORS.primary:COLORS.textSecondary;
  const relativeStart=formatRelativeStart(event.start_time);

  return <View style={styles.card}>
    <View style={styles.row}>
      <View style={styles.eventIcon}><Ionicons name="calendar-outline" size={21} color={COLORS.primary}/></View>
      <View style={styles.body}>
        <View style={styles.cardTop}>
          <View style={styles.cardHeading}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventCode}>Code: {event.event_code}</Text></View>
          <View style={[styles.statusBadge,badgeStyle]}><Text style={[styles.statusText,{color:badgeTextColor}]}>{status}</Text></View>
        </View>

        {event.venue?<MetaRow icon="location-outline" text={event.venue}/>:null}
        {event.start_time?<MetaRow icon="calendar-outline" text={formatSchedule(event.start_time,event.end_time)}/>:null}
        <MetaRow icon="timer-outline" text={'Late after '+(event.late_after_minutes??15)+' minutes'}/>

        {event.description?<Text style={styles.description}>{event.description}</Text>:null}

        {status==='Ongoing'?
          <View style={styles.noticeBox}><Ionicons name="radio-button-on-outline" size={17} color={COLORS.success}/><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>Attendance is open</Text><Text style={styles.noticeText}>Scan the event QR now. Scans after {event.late_after_minutes??15} minutes from the start are marked Late.</Text></View></View>:
          status==='Upcoming'?
          <View style={styles.upcomingNotice}><Ionicons name="time-outline" size={17} color={COLORS.warning}/><View style={styles.noticeCopy}><Text style={styles.upcomingTitle}>{relativeStart}</Text><Text style={styles.upcomingNoticeText}>Attendance opens when the event starts.</Text></View></View>:
          <View style={styles.endedNotice}><Ionicons name="checkmark-circle-outline" size={17} color={COLORS.textSecondary}/><Text style={styles.endedText}>This event has ended.</Text></View>}
      </View>
    </View>
  </View>;
}

type MetaRowProps={icon:keyof typeof Ionicons.glyphMap;text:string};
function MetaRow({icon,text}:MetaRowProps){return <View style={styles.metaRow}><Ionicons name={icon} size={15} color={COLORS.textSecondary}/><Text style={styles.metaText}>{text}</Text></View>}

function formatSchedule(startIso:string,endIso:string|null){
  const opts:Intl.DateTimeFormatOptions={month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'};
  const startText=new Date(startIso).toLocaleString(undefined,opts);
  return endIso?startText+' – '+new Date(endIso).toLocaleString(undefined,opts):startText;
}

function formatRelativeStart(startIso:string|null){
  if(!startIso)return 'Upcoming event';
  const diff=new Date(startIso).getTime()-Date.now();
  if(diff<=0)return 'Starting soon';
  const minutes=Math.ceil(diff/60000);
  if(minutes<60)return 'Starts in '+minutes+' min';
  const hours=Math.ceil(minutes/60);
  if(hours<24)return 'Starts in '+hours+' hr'+(hours===1?'':'s');
  const days=Math.ceil(hours/24);
  return 'Starts in '+days+' day'+(days===1?'':'s');
}

const styles=StyleSheet.create({
  card:{backgroundColor:COLORS.card,borderRadius:20,borderWidth:1,borderColor:COLORS.border,padding:14,marginBottom:11,shadowColor:COLORS.shadow,shadowOpacity:.03,shadowRadius:10,elevation:1},
  row:{flexDirection:'row',gap:11},
  eventIcon:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  body:{flex:1,minWidth:0},
  cardTop:{flexDirection:'row',alignItems:'flex-start',marginBottom:2},
  cardHeading:{flex:1,minWidth:0},
  eventTitle:{fontSize:15,fontWeight:'800',color:COLORS.textPrimary},
  eventCode:{marginTop:3,fontSize:10.5,fontWeight:'700',color:COLORS.primary},
  statusBadge:{borderRadius:999,paddingHorizontal:9,paddingVertical:5,marginLeft:8},
  ongoingBadge:{backgroundColor:COLORS.successSoft},
  upcomingBadge:{backgroundColor:COLORS.primarySoft},
  endedBadge:{backgroundColor:COLORS.surface},
  statusText:{fontSize:9.5,fontWeight:'800'},
  metaRow:{flexDirection:'row',alignItems:'flex-start',gap:6,marginTop:8},
  metaText:{flex:1,fontSize:11,lineHeight:16,color:COLORS.textSecondary},
  description:{marginTop:10,fontSize:12,lineHeight:18,color:COLORS.textPrimary},
  noticeBox:{marginTop:12,backgroundColor:COLORS.successSoft,borderRadius:12,paddingHorizontal:10,paddingVertical:9,flexDirection:'row',alignItems:'flex-start',gap:7},
  upcomingNotice:{marginTop:12,backgroundColor:COLORS.warningSoft,borderRadius:12,paddingHorizontal:10,paddingVertical:9,flexDirection:'row',alignItems:'flex-start',gap:7},
  endedNotice:{marginTop:12,backgroundColor:COLORS.surface,borderRadius:12,paddingHorizontal:10,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:7},
  noticeCopy:{flex:1},
  noticeTitle:{color:COLORS.success,fontSize:10.5,fontWeight:'800'},
  noticeText:{marginTop:2,color:'#537460',fontSize:10,lineHeight:15,fontWeight:'600'},
  upcomingTitle:{color:COLORS.warning,fontSize:10.5,fontWeight:'800'},
  upcomingNoticeText:{marginTop:2,color:COLORS.warning,fontSize:10,lineHeight:15,fontWeight:'600'},
  endedText:{color:COLORS.textSecondary,fontSize:10.5,fontWeight:'600'},
});
