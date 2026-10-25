import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import type { AttendanceStatus, EventAttendanceGroup, EventAttendee } from '@/lib/attendance';
import { formatHistoryDate } from '@/components/history/historyUtils';
import {
  getCorrectionRequests, manualCheckIn, markCorrectionReviewing, resolveCorrectionRequest,
  searchCheckinStudents, type CorrectionRequest, type SchoolStudent,
} from '@/lib/secure-attendance';

type Filter='all'|AttendanceStatus;
type Section='attendees'|'manual'|'requests';

type Props={
  visible:boolean;
  group:EventAttendanceGroup|null;
  editable?:boolean;
  onClose:()=>void;
  onCorrect?:(attendee:EventAttendee)=>void;
  onExport:()=>void;
  onUpdated?:()=>void;
};

export default function EventAttendeesModal({visible,group,editable=false,onClose,onCorrect,onExport,onUpdated}:Props){
  const [section,setSection]=useState<Section>('attendees');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<Filter>('all');
  const [studentQuery,setStudentQuery]=useState('');
  const [students,setStudents]=useState<SchoolStudent[]>([]);
  const [selectedStudent,setSelectedStudent]=useState<SchoolStudent|null>(null);
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [requests,setRequests]=useState<CorrectionRequest[]>([]);
  const [requestNotes,setRequestNotes]=useState<Record<string,string>>({});
  const [requestLoading,setRequestLoading]=useState(false);

  useEffect(()=>{
    if(!visible){
      setSection('attendees');setQuery('');setFilter('all');
      setStudentQuery('');setStudents([]);setSelectedStudent(null);setReason('');
    }
  },[visible]);

  const attendees=useMemo(()=>{
    if(!group)return [];
    const needle=query.trim().toLowerCase();
    return group.attendees.filter(item=>
      (filter==='all'||item.status===filter) &&
      (!needle||item.studentName?.toLowerCase().includes(needle)||
        item.studentEmail?.toLowerCase().includes(needle)||
        item.studentId?.toLowerCase().includes(needle))
    );
  },[group,query,filter]);

  const loadRequests=async()=>{
    if(!group)return;
    setRequestLoading(true);
    const result=await getCorrectionRequests(group.eventId);
    setRequestLoading(false);
    if(result.error)Alert.alert('Could not load requests',result.error);
    else setRequests(result.data);
  };

  const switchSection=(next:Section)=>{
    setSection(next);
    if(next==='requests')void loadRequests();
  };

  const findStudents=async()=>{
    if(!group||studentQuery.trim().length<2)return;
    setSelectedStudent(null);
    setBusy(true);
    const r=await searchCheckinStudents(group.eventId,studentQuery);
    setBusy(false);
    if(r.error)Alert.alert('Search failed',r.error);
    else setStudents(r.data);
  };

  const saveManual=async()=>{
    if(!group||!selectedStudent)return;
    if(reason.trim().length<5){
      Alert.alert('Reason required','Explain why a QR scan was not possible.');
      return;
    }
    setBusy(true);
    const r=await manualCheckIn(group.eventId,selectedStudent.id,reason);
    setBusy(false);
    if(r.error){Alert.alert('Check-in failed',r.error);return;}
    setStudents([]);setSelectedStudent(null);setReason('');setStudentQuery('');
    setSection('attendees');
    onUpdated?.();
    Alert.alert('Check-in recorded','The Student has been added to this event.');
  };

  const actOnRequest=async(item:CorrectionRequest,action:'review'|'approve'|'reject')=>{
    if(action!=='review'&&(requestNotes[item.id]??'').trim().length<5){
      Alert.alert('Review note required','Add a reason (at least 5 characters).');
      return;
    }
    setBusy(true);
    const r=action==='review'
      ?await markCorrectionReviewing(item.id)
      :await resolveCorrectionRequest(item.id,action==='approve',requestNotes[item.id]??'');
    setBusy(false);
    if(r.error){Alert.alert('Request update failed',r.error);return;}
    await loadRequests();
    onUpdated?.();
  };

  useEffect(()=>{
    if(!visible||section!=='requests'||!group?.eventId)return;
    const id=group.eventId;
    const channel=supabase.channel('event-requests-'+id)
      .on('postgres_changes',{event:'*',schema:'public',table:'attendance_correction_requests',filter:'event_id=eq.'+id},()=>{
        void getCorrectionRequests(id).then(result=>{if(!result.error)setRequests(result.data)});
      }).subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[visible,section,group?.eventId]);

  if(!group)return null;

  return <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerAction}><Ionicons name="arrow-back" size={21} color="#FFFFFF"/></Pressable>
        <View style={styles.headerCopy}><Text style={styles.title} numberOfLines={1}>{group.title}</Text><Text style={styles.sub}>{group.eventCode} · {group.attendeeCount} {group.attendeeCount === 1 ? 'attendee' : 'attendees'}</Text></View>
        <Pressable onPress={onExport} style={styles.headerAction}><Ionicons name="download-outline" size={20} color="#FFFFFF"/></Pressable>
      </View>
      <View style={styles.summary}>
        {[
          {label:'Total',value:group.attendeeCount,color:COLORS.textPrimary},
          {label:'Present',value:group.presentCount,color:COLORS.success},
          {label:'Late',value:group.lateCount,color:COLORS.warning},
          {label:'Excused',value:group.excusedCount,color:COLORS.primary},
        ].map(item=><View key={item.label} style={styles.metric}><Text style={[styles.metricValue,{color:item.color}]}>{item.value}</Text><Text style={styles.metricLabel}>{item.label}</Text></View>)}
      </View>
      <View style={styles.sections}>
        {([
          ['attendees','Attendees'],['manual','Manual Check-In'],['requests','Requests'],
        ] as const).map(([value,label])=><Pressable key={value} onPress={()=>switchSection(value)} style={[styles.sectionButton,section===value&&styles.sectionActive]}>
          <Text style={[styles.sectionText,section===value&&styles.sectionTextActive]}>{label}</Text>
        </Pressable>)}
      </View>

      {section==='attendees'?<View style={styles.body}>
        <View style={styles.search}><Ionicons name="search-outline" size={18} color={COLORS.textSecondary}/><TextInput value={query} onChangeText={setQuery} placeholder="Search student or ID" placeholderTextColor={COLORS.textSecondary} style={styles.input}/></View>
        <View style={styles.filters}>
          {(['all','present','late','excused'] as Filter[]).map(value=><Pressable key={value} onPress={()=>setFilter(value)} style={[styles.chip,filter===value&&styles.chipActive]}><Text style={[styles.chipText,filter===value&&styles.chipTextActive]}>{value==='all'?'All':value.charAt(0).toUpperCase()+value.slice(1)}</Text></Pressable>)}
        </View>
        <FlatList data={attendees} keyExtractor={item=>item.attendanceId} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Empty title="No matching attendees"/>}
          renderItem={({item})=><View style={styles.record}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.studentName?.[0]??'?').toUpperCase()}</Text></View>
            <View style={{flex:1}}>
              <View style={styles.line}><Text style={styles.name}>{item.studentName||'Unnamed student'}</Text><Text style={[styles.recordStatus,{color:item.status==='late'?COLORS.warning:item.status==='excused'?COLORS.primary:COLORS.success}]}>{item.status.toUpperCase()}</Text></View>
              <Text style={styles.meta}>{item.studentId||'Student ID unavailable'} · {formatHistoryDate(item.scannedAt)} · {item.recordedVia==='qr'?'QR':item.recordedVia==='manual'?'Manual':'Correction'}</Text>
              {editable?<Pressable onPress={()=>onCorrect?.(item)} style={styles.link}><Ionicons name="create-outline" size={14} color={COLORS.primary}/><Text style={styles.linkText}>Correct record</Text></Pressable>:null}
            </View>
          </View>}
        />
      </View>:
      section==='manual'?<ScrollView style={styles.body} contentContainerStyle={styles.form}>
        <Text style={styles.heading}>Manual Check-In</Text>
        <Text style={styles.helper}>For students who cannot scan a QR. This action is recorded in the audit log.</Text>
        <Text style={styles.label}>Find a Student</Text>
        <View style={styles.search}><TextInput value={studentQuery} onChangeText={setStudentQuery} style={styles.input} placeholder="Student ID, name, or email" placeholderTextColor={COLORS.textSecondary}/><Pressable onPress={()=>void findStudents()} disabled={busy||studentQuery.trim().length<2} style={styles.searchButton}><Ionicons name="search" color="#FFFFFF" size={17}/></Pressable></View>
        {busy?<ActivityIndicator color={COLORS.primary} style={{marginTop:12}}/>:null}
        {students.map(student=><Pressable key={student.id} onPress={()=>setSelectedStudent(student)} style={[styles.studentOption,selectedStudent?.id===student.id&&styles.selectedStudent]}><Text style={styles.name}>{student.full_name||student.email}</Text><Text style={styles.meta}>Student ID: {student.student_id}</Text>{selectedStudent?.id===student.id?<Ionicons name="checkmark-circle" color={COLORS.primary} size={20} style={styles.optionCheck}/>:null}</Pressable>)}
        <Text style={styles.label}>Reason (required)</Text>
        <TextInput value={reason} onChangeText={setReason} multiline numberOfLines={3} style={[styles.textArea]} placeholder="e.g., Student's phone camera was not working" placeholderTextColor={COLORS.textSecondary}/>
        <Pressable onPress={()=>void saveManual()} disabled={busy||!selectedStudent||reason.trim().length<5} style={[styles.mainButton,(busy||!selectedStudent||reason.trim().length<5)&&styles.disabled]}><Text style={styles.mainText}>Record Manual Attendance</Text></Pressable>
      </ScrollView>:
      <ScrollView style={styles.body} contentContainerStyle={styles.form}>
        <Text style={styles.heading}>Attendance Requests</Text>
        <Text style={styles.helper}>{editable?'Approve or reject with a reason.':'Review requests for your event. Only Admin can change attendance.'}</Text>
        {requestLoading?<ActivityIndicator color={COLORS.primary}/>:null}
        {requests.length===0&&!requestLoading?<Empty title="No correction requests"/>:null}
        {requests.map(item=><View key={item.id} style={styles.requestCard}>
          <View style={styles.line}><Text style={styles.name}>{item.profiles?.full_name||'Student'}</Text><Text style={styles.state}>{item.status.replace('_',' ')}</Text></View>
          <Text style={styles.meta}>{item.profiles?.student_id||'No ID'} · {item.events?.event_code||group.eventCode}</Text>
          <Text style={styles.requestReason}>{item.reason}</Text>
          <Text style={styles.meta}>Issue: {item.issue_type.replace('_',' ')} · Requested: {item.requested_status}</Text>
          {item.reviewer_notes?<Text style={styles.meta}>Admin notes: {item.reviewer_notes}</Text>:null}
          {item.status==='pending'||item.status==='under_review'?<>
            {editable?<TextInput value={requestNotes[item.id]??''} onChangeText={value=>setRequestNotes(prev=>({...prev,[item.id]:value}))} multiline placeholder="Review explanation (required)" placeholderTextColor={COLORS.textSecondary} style={styles.textArea}/>:null}
            <View style={styles.requestActions}>
              {!editable&&item.status==='pending'?<Pressable onPress={()=>void actOnRequest(item,'review')} style={styles.smallAction}><Text style={styles.smallActionText}>Mark Under Review</Text></Pressable>:null}
              {editable?<><Pressable disabled={busy} onPress={()=>void actOnRequest(item,'approve')} style={styles.smallAction}><Text style={styles.smallActionText}>Approve</Text></Pressable><Pressable disabled={busy} onPress={()=>void actOnRequest(item,'reject')} style={[styles.smallAction,styles.reject]}><Text style={[styles.smallActionText,{color:COLORS.danger}]}>Reject</Text></Pressable></>:null}
            </View>
          </>:null}
        </View>)}
      </ScrollView>}
    </View>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}

function Empty({title}:{title:string}){return <View style={styles.empty}><Ionicons name="people-outline" color={COLORS.primary} size={25}/><Text style={styles.helper}>{title}</Text></View>}
const styles=StyleSheet.create({
  safeArea:{flex:1,backgroundColor:COLORS.navy},
  screen:{flex:1,backgroundColor:COLORS.background},header:{backgroundColor:COLORS.navy,paddingTop:14,paddingHorizontal:16,paddingBottom:16,flexDirection:'row',alignItems:'center',gap:10},
  headerAction:{height:38,width:38,borderRadius:12,backgroundColor:'rgba(255,255,255,.1)',alignItems:'center',justifyContent:'center'},
  headerCopy:{flex:1},title:{fontSize:16,fontWeight:'800',color:'#FFFFFF'},sub:{marginTop:4,fontSize:10,color:'#B2C0DF'},
  summary:{margin:14,marginBottom:8,borderRadius:17,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.card,flexDirection:'row',paddingVertical:13},
  metric:{flex:1,alignItems:'center'},metricValue:{fontSize:18,fontWeight:'900'},metricLabel:{fontSize:9,color:COLORS.textSecondary},
  sections:{flexDirection:'row',gap:6,marginHorizontal:14,marginBottom:10},sectionButton:{flex:1,minHeight:37,justifyContent:'center',alignItems:'center',borderRadius:11,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border},sectionActive:{backgroundColor:COLORS.primarySoft,borderColor:'#9DB0FF'},
  sectionText:{fontSize:10,fontWeight:'700',color:COLORS.textSecondary},sectionTextActive:{color:COLORS.primary},
  body:{flex:1,paddingHorizontal:14},search:{minHeight:44,flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:11,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.card,borderRadius:13},input:{flex:1,color:COLORS.textPrimary,fontSize:12.5},
  filters:{flexDirection:'row',gap:6,marginTop:9,marginBottom:9},chip:{flex:1,minHeight:32,borderRadius:999,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.card,justifyContent:'center',alignItems:'center'},chipActive:{backgroundColor:COLORS.primarySoft,borderColor:'#9DB0FF'},
  chipText:{fontSize:9.5,color:COLORS.textSecondary,fontWeight:'700'},chipTextActive:{color:COLORS.primary},
  list:{paddingBottom:30},record:{flexDirection:'row',gap:10,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.card,borderRadius:16,padding:12,marginBottom:9},avatar:{width:39,height:39,borderRadius:13,backgroundColor:COLORS.primarySoft,justifyContent:'center',alignItems:'center'},avatarText:{fontWeight:'900',color:COLORS.primary},
  line:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},name:{fontSize:12,fontWeight:'800',color:COLORS.textPrimary,flexShrink:1},recordStatus:{fontSize:9,fontWeight:'800'},meta:{fontSize:10,color:COLORS.textSecondary,marginTop:5},link:{flexDirection:'row',alignItems:'center',gap:5,marginTop:9},linkText:{color:COLORS.primary,fontSize:10,fontWeight:'800'},
  form:{paddingBottom:40},heading:{fontSize:16,color:COLORS.textPrimary,fontWeight:'800'},helper:{fontSize:11,color:COLORS.textSecondary,lineHeight:17,marginTop:5},label:{fontSize:11,color:COLORS.textPrimary,fontWeight:'800',marginTop:18,marginBottom:8},searchButton:{width:34,height:34,backgroundColor:COLORS.primary,borderRadius:10,justifyContent:'center',alignItems:'center'},
  studentOption:{borderRadius:13,padding:12,marginTop:8,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.card},selectedStudent:{borderColor:COLORS.primary,backgroundColor:COLORS.primarySoft},optionCheck:{position:'absolute',right:13,top:13},
  textArea:{minHeight:70,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:13,padding:10,textAlignVertical:'top',fontSize:12,color:COLORS.textPrimary,marginTop:8},
  mainButton:{marginTop:16,minHeight:44,borderRadius:13,backgroundColor:COLORS.primary,justifyContent:'center',alignItems:'center'},mainText:{color:'#FFFFFF',fontSize:12,fontWeight:'800'},disabled:{opacity:.45},
  requestCard:{padding:13,borderRadius:16,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.card,marginTop:10},state:{textTransform:'capitalize',color:COLORS.primary,fontSize:10,fontWeight:'800'},requestReason:{fontSize:11.5,lineHeight:17,color:COLORS.textPrimary,marginTop:10},
  requestActions:{flexDirection:'row',gap:9,marginTop:10},smallAction:{minHeight:34,paddingHorizontal:13,borderRadius:11,backgroundColor:COLORS.primarySoft,justifyContent:'center'},smallActionText:{fontSize:10,fontWeight:'800',color:COLORS.primary},reject:{backgroundColor:COLORS.dangerSoft},empty:{minHeight:160,justifyContent:'center',alignItems:'center'}
});
