import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { AttendanceStatus } from '@/lib/attendance';
import { cancelCorrectionRequest, getCorrectionRequests, submitCorrectionRequest, type CorrectionIssue, type CorrectionRequest } from '@/lib/secure-attendance';
import { supabase } from '@/lib/supabase';

type EventOption={id:string;title:string;event_code:string};
type Props={
  visible:boolean;
  studentId:string;
  initialEventId?:string|null;
  initialStatus?:AttendanceStatus|null;
  onClose:()=>void;
  onSubmitted?:()=>void;
  initialView?:'new'|'mine';
};

const ISSUES:{value:CorrectionIssue;label:string}[]=[
  {value:'incorrect_status',label:'Incorrect attendance status'},
  {value:'missing',label:'Missing attendance'},
  {value:'wrong_event',label:'Wrong event or record'},
  {value:'other',label:'Other issue'},
];

export default function StudentCorrectionModal({visible,studentId,initialEventId,initialStatus,onClose,onSubmitted,initialView='new'}:Props){
  const [events,setEvents]=useState<EventOption[]>([]);
  const [pickerOpen,setPickerOpen]=useState(false);
  const [pickerSearch,setPickerSearch]=useState('');
  const [eventId,setEventId]=useState(initialEventId??'');
  const [issue,setIssue]=useState<CorrectionIssue>(initialStatus?'incorrect_status':'missing');
  const [status,setStatus]=useState<AttendanceStatus>('present');
  const [reason,setReason]=useState('');
  const [requests,setRequests]=useState<CorrectionRequest[]>([]);
  const [busy,setBusy]=useState(false);
  const [view,setView]=useState<'new'|'mine'>('new');

  const refresh=async()=>{
    const [e,r]=await Promise.all([
      supabase.from('events').select('id,title,event_code').order('created_at',{ascending:false}).limit(60),
      getCorrectionRequests(undefined,studentId),
    ]);
    if(e.error)Alert.alert('Could not load events',e.error.message);
    else setEvents((e.data??[]) as EventOption[]);
    if(r.error)Alert.alert('Could not load requests',r.error);
    else setRequests(r.data);
  };

  useEffect(()=>{
    if(!visible)return;
    setEventId(initialEventId??'');
    setPickerOpen(false);
    setPickerSearch('');
    setIssue(initialStatus?'incorrect_status':'missing');
    setStatus(initialStatus==='late'?'present':initialStatus??'present');
    setReason('');
    setView(initialView);
    void refresh();
  },[visible,initialEventId,initialStatus,studentId,initialView]);

  const cancel=async(id:string)=>{
    const result=await cancelCorrectionRequest(id);
    if(result.error){Alert.alert('Could not cancel',result.error);return;}
    await refresh();
  };

  useEffect(()=>{
    if(!visible||!studentId)return;
    const channel=supabase.channel('student-corrections-'+studentId)
      .on('postgres_changes',{event:'*',schema:'public',table:'attendance_correction_requests',filter:'student_id=eq.'+studentId},()=>{void refresh();})
      .subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[visible,studentId]);

  const selectedEvent=events.find(event=>event.id===eventId);
  const filteredEvents=events.filter(event=>
    (event.title+' '+event.event_code).toLowerCase().includes(pickerSearch.trim().toLowerCase())
  );

  const chooseEvent=(id:string)=>{
    setEventId(id);
    setPickerOpen(false);
    setPickerSearch('');
  };

  const submit=async()=>{
    if(!eventId){Alert.alert('Select an event','Choose the event connected to your request.');return;}
    if(reason.trim().length<10){Alert.alert('Explain the issue','Enter at least 10 characters.');return;}
    setBusy(true);
    const result=await submitCorrectionRequest({eventId,issue,requestedStatus:status,reason});
    setBusy(false);
    if(result.error){Alert.alert('Request not submitted',result.error);return;}
    await refresh();
    onSubmitted?.();
    setView('mine');
    Alert.alert('Request sent','Your request is waiting for review.');
  };

  return <Modal visible={visible} animationType="slide" onRequestClose={()=>pickerOpen?setPickerOpen(false):onClose()}>
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.back}><Ionicons name="arrow-back" size={21} color="#FFFFFF"/></Pressable>
        <View><Text style={styles.headerTitle}>Attendance Support</Text></View>
      </View>
      <View style={styles.tabs}>
        {(['new','mine'] as const).map(v=><Pressable key={v} onPress={()=>setView(v)} style={[styles.tab,view===v&&styles.tabActive]}><Text style={[styles.tabText,view===v&&styles.tabTextActive]}>{v==='new'?'Report an Issue':'My Requests'}</Text></Pressable>)}
      </View>
      {view==='new'?<ScrollView style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Event</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selectedEvent?'Change event, '+selectedEvent.title:'Select an event'}
          onPress={()=>{setPickerSearch('');setPickerOpen(true)}}
          style={[styles.eventSelector,selectedEvent&&styles.optionSelected]}
        >
          <Ionicons name="calendar-outline" size={19} color={COLORS.primary}/>
          <View style={styles.selectedEventCopy}>
            <Text style={[styles.selectorTitle,!selectedEvent&&styles.selectorPlaceholder]} numberOfLines={1}>
              {selectedEvent?.title??'Select an event'}
            </Text>
            {selectedEvent?<Text style={styles.meta}>{selectedEvent.event_code}</Text>:null}
          </View>
          <Ionicons name="chevron-down" size={19} color={COLORS.textSecondary}/>
        </Pressable>
        <Text style={styles.label}>What happened?</Text>
        {ISSUES.map(option=><Pressable key={option.value} onPress={()=>setIssue(option.value)} style={[styles.radio,issue===option.value&&styles.optionSelected]}><Ionicons name={issue===option.value?'radio-button-on':'radio-button-off'} color={COLORS.primary} size={18}/><Text style={styles.optionName}>{option.label}</Text></Pressable>)}
        <Text style={styles.label}>Requested status</Text>
        <View style={styles.statusRow}>
          {(['present','late','excused'] as AttendanceStatus[]).map(v=><Pressable key={v} onPress={()=>setStatus(v)} style={[styles.statusChoice,status===v&&styles.optionSelected]}><Text style={[styles.statusText,status===v&&{color:COLORS.primary}]}>{v.charAt(0).toUpperCase()+v.slice(1)}</Text></Pressable>)}
        </View>
        <Text style={styles.label}>Explanation</Text>
        <TextInput value={reason} onChangeText={setReason} multiline numberOfLines={4} maxLength={1000} placeholder="Explain when you attended and why the record should be corrected." placeholderTextColor={COLORS.textSecondary} style={styles.textArea}/>
        <Pressable onPress={()=>void submit()} disabled={busy||!eventId||reason.trim().length<10} style={[styles.save,(busy||!eventId||reason.trim().length<10)&&styles.disabled]}>
          {busy?<ActivityIndicator color="#FFFFFF"/>:<Text style={styles.saveText}>Submit Request</Text>}
        </Pressable>
      </ScrollView>:
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {requests.length===0?<View style={styles.empty}><Ionicons name="document-text-outline" size={28} color={COLORS.primary}/><Text style={styles.helper}>You have no requests yet.</Text></View>:requests.map(request=><View key={request.id} style={styles.requestCard}>
          <View style={styles.row}><Text style={styles.optionName}>{request.events?.title??'Event'}</Text><Text style={[styles.requestStatus,{color:request.status==='approved'?COLORS.success:request.status==='rejected'?COLORS.danger:COLORS.primary}]}>{request.status.replace('_',' ')}</Text></View>
          <Text style={styles.meta}>{request.issue_type.replace('_',' ')} · Requested: {request.requested_status}</Text>
          <Text style={styles.reason}>{request.reason}</Text>
          {request.reviewer_notes?<Text style={styles.notes}>Review notes: {request.reviewer_notes}</Text>:null}
          <Text style={styles.meta}>{new Date(request.created_at).toLocaleString()}</Text>
          {request.status==='pending'||request.status==='under_review'?<Pressable onPress={()=>void cancel(request.id)} style={styles.cancel}><Text style={styles.cancelText}>Cancel Request</Text></Pressable>:null}
        </View>)}
      </ScrollView>}
      {pickerOpen?<View style={styles.pickerOverlay}>
        <Pressable accessibilityLabel="Close event selector" onPress={()=>setPickerOpen(false)} style={styles.pickerBackdrop}/>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle}/>
          <View style={styles.pickerHeader}>
            <View style={styles.pickerHeaderText}>
              <Text style={styles.pickerTitle}>Select an event</Text>
              <Text style={styles.pickerSub}>Search by event name or code</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close event selector" onPress={()=>setPickerOpen(false)} style={styles.pickerClose}>
              <Ionicons name="close" size={20} color={COLORS.textPrimary}/>
            </Pressable>
          </View>
          <View style={styles.pickerSearchBox}>
            <Ionicons name="search-outline" color={COLORS.textSecondary} size={19}/>
            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder="Search event or code"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.pickerSearchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {pickerSearch.length>0?<Pressable accessibilityLabel="Clear search" onPress={()=>setPickerSearch('')}>
              <Ionicons name="close-circle" color={COLORS.textSecondary} size={19}/>
            </Pressable>:null}
          </View>
          <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pickerListContent}>
            {filteredEvents.length===0?<View style={styles.pickerEmpty}>
              <Ionicons name="search-outline" size={25} color={COLORS.textSecondary}/>
              <Text style={styles.helper}>{events.length===0?'No events available':'No matching events'}</Text>
            </View>:filteredEvents.map(event=><Pressable
              key={event.id}
              accessibilityRole="button"
              accessibilityState={{selected:event.id===eventId}}
              onPress={()=>chooseEvent(event.id)}
              style={[styles.pickerOption,event.id===eventId&&styles.pickerOptionSelected]}
            >
              <View style={styles.pickerOptionCopy}>
                <Text style={styles.optionName} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.meta}>Code: {event.event_code}</Text>
              </View>
              {event.id===eventId?<Ionicons name="checkmark-circle" size={21} color={COLORS.primary}/>:null}
            </Pressable>)}
          </ScrollView>
        </View>
      </View>:null}
    </View>
  </Modal>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:COLORS.background},header:{backgroundColor:COLORS.navy,paddingTop:14,paddingHorizontal:16,paddingBottom:16,flexDirection:'row',alignItems:'center',gap:12},
 back:{width:39,height:39,borderRadius:12,backgroundColor:'rgba(255,255,255,.1)',alignItems:'center',justifyContent:'center'},headerTitle:{color:'#FFFFFF',fontSize:17,fontWeight:'800'},
 tabs:{flexDirection:'row',gap:8,margin:14},tab:{flex:1,minHeight:39,borderRadius:12,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.card,justifyContent:'center',alignItems:'center'},tabActive:{backgroundColor:COLORS.primarySoft,borderColor:'#97ACFF'},tabText:{color:COLORS.textSecondary,fontWeight:'700',fontSize:11},tabTextActive:{color:COLORS.primary},
 body:{flex:1},content:{paddingHorizontal:15,paddingBottom:36},label:{marginTop:13,marginBottom:8,fontSize:11,fontWeight:'800',color:COLORS.textPrimary},helper:{fontSize:10.5,lineHeight:16,color:COLORS.textSecondary},
 eventSelector:{flexDirection:'row',alignItems:'center',gap:10,minHeight:54,paddingHorizontal:12,paddingVertical:9,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:13},
 selectedEventCopy:{flex:1,minWidth:0},selectorTitle:{fontSize:12.5,fontWeight:'800',color:COLORS.textPrimary},
 selectorPlaceholder:{fontWeight:'500',color:COLORS.textSecondary},
 optionSelected:{borderColor:COLORS.primary,backgroundColor:COLORS.primarySoft},
 pickerOverlay:{...StyleSheet.absoluteFillObject,zIndex:20,justifyContent:'flex-end',backgroundColor:'rgba(10,17,41,0.55)'},
 pickerBackdrop:{...StyleSheet.absoluteFillObject},
 pickerSheet:{height:'68%',minHeight:300,backgroundColor:COLORS.background,borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:16,paddingBottom:22,overflow:'hidden'},
 pickerHandle:{alignSelf:'center',width:42,height:5,borderRadius:8,backgroundColor:COLORS.border,marginTop:10,marginBottom:15},
 pickerHeader:{flexDirection:'row',alignItems:'center',marginBottom:15,gap:12},
 pickerHeaderText:{flex:1},pickerTitle:{fontSize:17,fontWeight:'800',color:COLORS.textPrimary},pickerSub:{marginTop:3,fontSize:10.5,color:COLORS.textSecondary},
 pickerClose:{width:36,height:36,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:COLORS.card},
 pickerSearchBox:{flexDirection:'row',alignItems:'center',gap:9,minHeight:47,paddingHorizontal:12,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:14},
 pickerSearchInput:{flex:1,fontSize:12.5,color:COLORS.textPrimary},
 pickerList:{flex:1,marginTop:12},pickerListContent:{paddingBottom:20},
 pickerOption:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:13,paddingVertical:13,marginBottom:8,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:14},
 pickerOptionSelected:{borderColor:COLORS.primary,backgroundColor:COLORS.primarySoft},
 pickerOptionCopy:{flex:1,minWidth:0},pickerEmpty:{minHeight:120,alignItems:'center',justifyContent:'center',gap:8},
 optionName:{fontSize:12,color:COLORS.textPrimary,fontWeight:'700'},meta:{fontSize:10,color:COLORS.textSecondary,marginTop:4},
 radio:{flexDirection:'row',gap:10,alignItems:'center',padding:10,marginTop:5,borderRadius:12,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.card},
 statusRow:{flexDirection:'row',gap:7},statusChoice:{flex:1,minHeight:37,justifyContent:'center',alignItems:'center',backgroundColor:COLORS.card,borderRadius:12,borderWidth:1,borderColor:COLORS.border},statusText:{fontSize:10.5,fontWeight:'800',color:COLORS.textSecondary},
 textArea:{minHeight:98,padding:12,backgroundColor:COLORS.card,borderRadius:12,borderWidth:1,borderColor:COLORS.border,color:COLORS.textPrimary,fontSize:12,textAlignVertical:'top'},
 save:{minHeight:47,borderRadius:13,backgroundColor:COLORS.primary,justifyContent:'center',alignItems:'center',marginTop:17},saveText:{fontSize:12,fontWeight:'800',color:'#FFFFFF'},disabled:{opacity:.5},
 empty:{minHeight:200,alignItems:'center',justifyContent:'center',gap:9},
 cancel:{alignSelf:'flex-start',marginTop:10,paddingVertical:5},cancelText:{fontSize:10,fontWeight:'800',color:COLORS.danger},
 requestCard:{padding:13,borderWidth:1,borderColor:COLORS.border,borderRadius:16,backgroundColor:COLORS.card,marginBottom:10},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},requestStatus:{fontSize:10,fontWeight:'800',textTransform:'capitalize'},reason:{fontSize:11.5,color:COLORS.textPrimary,lineHeight:17,marginTop:10},notes:{fontSize:11,color:COLORS.primary,marginTop:8}
});
