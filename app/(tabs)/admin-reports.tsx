import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/colors';
import { getAdminAttendance, getAdminDashboardStats, getAdminEvents, type AdminAttendanceRecord, type AdminDashboardStats, type AdminEventRecord } from '@/lib/admin';
import { formatAuditAction, getAuditLogs, type AuditLog } from '@/lib/audit';
import { useAuth } from '@/lib/auth';
import { useCachedProfile } from '@/lib/profile-cache';

const EMPTY:AdminDashboardStats={
  totalUsers:0,students:0,teachers:0,admins:0,totalEvents:0,openEvents:0,closedEvents:0,
  attendanceRecords:0,presentAttendance:0,lateAttendance:0,excusedAttendance:0,
};

export default function AdminReportsScreen(){
  const{user}=useAuth();
  const{profile}=useCachedProfile(user?.id);
  const[stats,setStats]=useState(EMPTY);
  const[events,setEvents]=useState<AdminEventRecord[]>([]);
  const[attendance,setAttendance]=useState<AdminAttendanceRecord[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState<string|null>(null);
  const[activity,setActivity]=useState<AuditLog[]>([]);

  const load=useCallback(async()=>{
    setLoading(true);
    const[statsResult,eventsResult,attendanceResult,auditResult]=await Promise.all([
      getAdminDashboardStats(),
      getAdminEvents(),
      getAdminAttendance(),
      getAuditLogs(15),
    ]);
    setStats(statsResult.data);
    setEvents(eventsResult.data);
    setAttendance(attendanceResult.data);
    setActivity(auditResult.data);
    setError(statsResult.error??eventsResult.error??attendanceResult.error??auditResult.error);
    setLoading(false);
  },[]);

  useFocusEffect(useCallback(()=>{if(profile?.role==='admin')void load()},[profile?.role,load]));

  const eventRows=useMemo(()=>events.map(event=>{
    const rows=attendance.filter(record=>record.eventId===event.id);
    return{
      event,
      total:rows.length,
      present:rows.filter(record=>record.status==='present').length,
      late:rows.filter(record=>record.status==='late').length,
      excused:rows.filter(record=>record.status==='excused').length,
    };
  }),[events,attendance]);

  if(profile?.role!=='admin')return <SafeAreaView style={styles.safeArea} edges={['top']}><PageHeader title="Reports"/><View style={styles.center}><Ionicons name="shield-outline" size={34} color={COLORS.primary}/><Text style={styles.emptyTitle}>Admins only</Text></View></SafeAreaView>;

  return <SafeAreaView style={styles.safeArea} edges={['top']}>
    <PageHeader title="System Reports"/>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {loading?<View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary}/><Text style={styles.helper}>Building report...</Text></View>:null}
      {error?<View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={COLORS.danger}/><Text style={styles.errorText}>{error}</Text></View>:null}

      <Text style={styles.sectionTitle}>System Summary</Text>
      <View style={styles.grid}>
        <Stat label="Users" value={stats.totalUsers} icon="people-outline"/>
        <Stat label="Events" value={stats.totalEvents} icon="calendar-outline"/>
        <Stat label="Attendance" value={stats.attendanceRecords} icon="checkmark-done-outline"/>
        <Stat label="Open Events" value={stats.openEvents} icon="radio-button-on-outline"/>
      </View>

      <Text style={styles.sectionTitle}>Attendance Status</Text>
      <View style={styles.statusCard}>
        <StatusRow label="Present" value={stats.presentAttendance} background={COLORS.successSoft} color={COLORS.success}/>
        <View style={styles.divider}/>
        <StatusRow label="Late" value={stats.lateAttendance} background={COLORS.warningSoft} color={COLORS.warning}/>
        <View style={styles.divider}/>
        <StatusRow label="Excused" value={stats.excusedAttendance} background={COLORS.primarySoft} color={COLORS.primary}/>
      </View>

      <Text style={styles.sectionTitle}>System Activity</Text>
      <View style={styles.activityCard}>
        {activity.length===0?<Text style={styles.helper}>No system activity recorded yet.</Text>:activity.map((item,index)=><View key={item.id} style={[styles.activityRow,index<activity.length-1&&styles.activityBorder]}>
          <View style={styles.activityIcon}><Ionicons name="pulse-outline" size={16} color={COLORS.primary}/></View>
          <View style={styles.activityCopy}><Text style={styles.activityText}>{formatAuditAction(item)}</Text><Text style={styles.activityTime}>{new Date(item.createdAt).toLocaleString()}</Text></View>
        </View>)}
      </View>

      <Text style={styles.sectionTitle}>Per Event</Text>
      {eventRows.length===0?<View style={styles.empty}><Text style={styles.emptyTitle}>No events yet</Text><Text style={styles.helper}>Event summaries will appear here.</Text></View>:eventRows.map(row=><View key={row.event.id} style={styles.eventCard}>
        <View style={styles.eventTop}><View style={styles.eventIcon}><Ionicons name="calendar-outline" size={19} color={COLORS.primary}/></View><View style={styles.eventHeading}><Text style={styles.eventTitle}>{row.event.title}</Text><Text style={styles.eventCode}>{row.event.event_code}</Text></View><Text style={styles.total}>{row.total}</Text></View>
        <View style={styles.eventStats}>
          <MiniStatus label="Present" value={row.present} color={COLORS.success}/>
          <MiniStatus label="Late" value={row.late} color={COLORS.warning}/>
          <MiniStatus label="Excused" value={row.excused} color={COLORS.primary}/>
        </View>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

function Stat({label,value,icon}:{label:string;value:number;icon:keyof typeof Ionicons.glyphMap}){return <View style={styles.stat}><View style={styles.statIcon}><Ionicons name={icon} size={20} color={COLORS.primary}/></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>}
function StatusRow({label,value,background,color}:{label:string;value:number;background:string;color:string}){return <View style={styles.statusRow}><View style={[styles.dot,{backgroundColor:background}]}><View style={[styles.dotInner,{backgroundColor:color}]}/></View><Text style={styles.statusLabel}>{label}</Text><Text style={[styles.statusValue,{color}]}>{value}</Text></View>}
function MiniStatus({label,value,color}:{label:string;value:number;color:string}){return <View style={styles.mini}><Text style={[styles.miniValue,{color}]}>{value}</Text><Text style={styles.miniLabel}>{label}</Text></View>}

const styles=StyleSheet.create({
  safeArea:{flex:1,backgroundColor:COLORS.navy},
  container:{flex:1,backgroundColor:COLORS.background},
  content:{padding:16,paddingBottom:110},
  loading:{alignItems:'center',paddingVertical:18},
  helper:{marginTop:6,fontSize:10.5,lineHeight:16,color:COLORS.textSecondary,textAlign:'center'},
  error:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.dangerSoft,borderRadius:14,padding:11,marginBottom:12},
  errorText:{flex:1,fontSize:10.5,color:COLORS.danger,fontWeight:'600'},
  sectionTitle:{fontSize:14,fontWeight:'800',color:COLORS.textPrimary,marginTop:4,marginBottom:10},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:18},
  stat:{width:'48%',flexGrow:1,minHeight:112,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:18,padding:13},
  statIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.primarySoft},
  statValue:{marginTop:10,fontSize:22,fontWeight:'900',color:COLORS.textPrimary},
  statLabel:{marginTop:2,fontSize:10,color:COLORS.textSecondary,fontWeight:'600'},
  statusCard:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:18,paddingHorizontal:13,marginBottom:18},
  statusRow:{minHeight:52,flexDirection:'row',alignItems:'center'},
  dot:{width:32,height:32,borderRadius:11,alignItems:'center',justifyContent:'center',marginRight:10},
  dotInner:{width:10,height:10,borderRadius:5},
  statusLabel:{flex:1,fontSize:12,fontWeight:'700',color:COLORS.textPrimary},
  statusValue:{fontSize:15,fontWeight:'900'},
  divider:{height:1,backgroundColor:COLORS.border,marginLeft:42},
  activityCard:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:18,paddingHorizontal:13,marginBottom:18},
  activityRow:{minHeight:56,flexDirection:'row',alignItems:'center',gap:9,paddingVertical:9},
  activityBorder:{borderBottomWidth:1,borderBottomColor:COLORS.border},
  activityIcon:{width:32,height:32,borderRadius:10,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  activityCopy:{flex:1},
  activityText:{fontSize:10.5,lineHeight:15,fontWeight:'700',color:COLORS.textPrimary},
  activityTime:{marginTop:2,fontSize:8.5,color:COLORS.textSecondary},
  eventCard:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:18,padding:13,marginBottom:10},
  eventTop:{flexDirection:'row',alignItems:'center',gap:10},
  eventIcon:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.primarySoft},
  eventHeading:{flex:1},
  eventTitle:{fontSize:12.5,fontWeight:'800',color:COLORS.textPrimary},
  eventCode:{marginTop:2,fontSize:9.5,fontWeight:'700',color:COLORS.primary},
  total:{fontSize:20,fontWeight:'900',color:COLORS.textPrimary},
  eventStats:{flexDirection:'row',marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:COLORS.border},
  mini:{flex:1,alignItems:'center'},
  miniValue:{fontSize:14,fontWeight:'900'},
  miniLabel:{marginTop:2,fontSize:8.5,color:COLORS.textSecondary},
  empty:{minHeight:130,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.card,borderRadius:18,borderWidth:1,borderColor:COLORS.border},
  emptyTitle:{fontSize:14,fontWeight:'800',color:COLORS.textPrimary},
  center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.background},
});
