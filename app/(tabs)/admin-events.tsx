import Ionicons from '@expo/vector-icons/Ionicons';
import { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventDetailsModal from '@/components/events/EventDetailsModal';
import EventQRCodeCard from '@/components/teacher/EventQRCodeCard';
import TeacherEventForm, { type EditTarget, type MessageType } from '@/components/teacher/TeacherEventForm';
import { COLORS } from '@/constants/colors';
import { getAdminEvents, type AdminEventRecord } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { closeEvent, createEvent, getEventDisplayStatus, updateEvent, type CloudEvent } from '@/lib/events';
import { useCachedProfile } from '@/lib/profile-cache';

function parseEventDate(value:string|null,fallback:Date){
  if(!value)return fallback;
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?fallback:parsed;
}

export default function AdminEventsScreen(){
  const{user}=useAuth();
  const{profile}=useCachedProfile(user?.id);
  const[events,setEvents]=useState<AdminEventRecord[]>([]);
  const[loading,setLoading]=useState(true);
  const[query,setQuery]=useState('');
  const[editingEvent,setEditingEvent]=useState<AdminEventRecord|null>(null);
  const[viewEvent,setViewEvent]=useState<AdminEventRecord|null>(null);
  const[qrEvent,setQrEvent]=useState<CloudEvent|null>(null);
  const[title,setTitle]=useState('');
  const[eventId,setEventId]=useState('');
  const[venue,setVenue]=useState('');
  const[description,setDescription]=useState('');
  const[startDate,setStartDate]=useState(()=>new Date());
  const[endDate,setEndDate]=useState(()=>new Date(Date.now()+60*60*1000));
  const[lateAfterMinutes,setLateAfterMinutes]=useState(15);
  const[editTarget,setEditTarget]=useState<EditTarget|null>(null);
  const[editingPart,setEditingPart]=useState<'date'|'time'>('date');
  const[message,setMessage]=useState<string|null>(null);
  const[messageType,setMessageType]=useState<MessageType>('success');
  const[saving,setSaving]=useState(false);

  const loadEvents=useCallback(async()=>{
    setLoading(true);
    const result=await getAdminEvents();
    setEvents(result.data);
    if(result.error){
      setMessageType('error');
      setMessage(result.error);
    }
    setLoading(false);
  },[]);

  useFocusEffect(useCallback(()=>{
    if(profile?.role==='admin')void loadEvents();
  },[profile?.role,loadEvents]));

  const resetForm=()=>{
    const now=new Date();
    setEditingEvent(null);
    setTitle('');
    setEventId('');
    setVenue('');
    setDescription('');
    setStartDate(now);
    setEndDate(new Date(now.getTime()+60*60*1000));
    setLateAfterMinutes(15);
    setEditTarget(null);
    setEditingPart('date');
  };

  const openPicker=(target:EditTarget)=>{
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange=(event:DateTimePickerEvent,selected?:Date)=>{
    if(!editTarget)return;

    if(event.type==='dismissed'||!selected){
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current=editTarget==='start'?startDate:endDate;
    const next=new Date(current);
    const isAndroid=Platform.OS==='android';

    if(isAndroid&&editingPart==='date'){
      next.setFullYear(selected.getFullYear(),selected.getMonth(),selected.getDate());
    }else if(isAndroid&&editingPart==='time'){
      next.setHours(selected.getHours(),selected.getMinutes(),0,0);
    }else{
      next.setFullYear(selected.getFullYear(),selected.getMonth(),selected.getDate());
      next.setHours(selected.getHours(),selected.getMinutes(),0,0);
    }

    editTarget==='start'?setStartDate(next):setEndDate(next);

    if(isAndroid&&editingPart==='date'){
      setEditingPart('time');
    }else{
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const validate=()=>{
    if(!title.trim()||!eventId.trim()){
      setMessageType('error');
      setMessage('Event title and code are required.');
      return false;
    }

    if(!venue.trim()){
      setMessageType('error');
      setMessage('Venue is required.');
      return false;
    }

    if(endDate.getTime()<=startDate.getTime()){
      setMessageType('error');
      setMessage('End time must be after start time.');
      return false;
    }

    return true;
  };

  const saveEvent=async()=>{
    setMessage(null);
    if(!validate())return;
    setSaving(true);

    const values={
      title:title.trim(),
      venue:venue.trim(),
      description:description.trim(),
      start:startDate.toISOString(),
      end:endDate.toISOString(),
      lateAfterMinutes,
    };

    if(editingEvent){
      const result=await updateEvent(editingEvent.id,values);
      setSaving(false);

      if(result.error||!result.data){
        setMessageType('error');
        setMessage(result.error||'Could not update the event.');
        return;
      }

      setMessageType('success');
      setMessage('Event updated.');
      setQrEvent(result.data);
      resetForm();
      await loadEvents();
      return;
    }

    const result=await createEvent({
      eventId:eventId.trim(),
      ...values,
    });
    setSaving(false);

    if(result.error||!result.data){
      setMessageType('error');
      setMessage(result.error?.toLowerCase().includes('unique')||result.error?.toLowerCase().includes('duplicate')?'That event code is already in use.':result.error||'Could not create the event.');
      return;
    }

    setMessageType('success');
    setMessage('Event created. Its QR code is ready below.');
    setQrEvent(result.data);
    await loadEvents();
  };

  const editEvent=(event:AdminEventRecord)=>{
    const now=new Date();
    setEditingEvent(event);
    setEventId(event.event_code);
    setTitle(event.title);
    setVenue(event.venue??'');
    setDescription(event.description??'');
    setStartDate(parseEventDate(event.start_time,now));
    setEndDate(parseEventDate(event.end_time,new Date(now.getTime()+60*60*1000)));
    setLateAfterMinutes(event.late_after_minutes??15);
    setQrEvent(null);
    setMessage(null);
  };

  const showQr=(event:AdminEventRecord)=>{
    const status=getEventDisplayStatus(event);
    if(status==='Closed'||status==='Ended'){
      Alert.alert('QR unavailable',status==='Closed'?'Closed events cannot accept attendance scans.':'Ended events can no longer accept attendance scans.');
      return;
    }
    setQrEvent(event);
  };

  const closeAdminEvent=(event:AdminEventRecord)=>{
    Alert.alert('Close event?',event.title+' will stop accepting attendance scans.',[
      {text:'Cancel',style:'cancel'},
      {
        text:'Close Event',
        style:'destructive',
        onPress:async()=>{
          const result=await closeEvent(event.id);
          if(result.error){
            Alert.alert('Could not close event',result.error);
            return;
          }
          if(qrEvent?.id===event.id)setQrEvent(null);
          await loadEvents();
        },
      },
    ]);
  };

  const filteredEvents=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    if(!needle)return events;
    return events.filter(event=>
      event.title.toLowerCase().includes(needle)||
      event.event_code.toLowerCase().includes(needle)||
      event.venue?.toLowerCase().includes(needle)||
      event.creatorName?.toLowerCase().includes(needle)||
      event.creatorEmail?.toLowerCase().includes(needle)
    );
  },[events,query]);

  if(profile?.role!=='admin')return <AccessDenied/>;

  return <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <TeacherEventForm
        editingEvent={editingEvent}
        title={title}
        eventId={eventId}
        venue={venue}
        description={description}
        startDate={startDate}
        endDate={endDate}
        lateAfterMinutes={lateAfterMinutes}
        editTarget={editTarget}
        editingPart={editingPart}
        isAndroid={Platform.OS==='android'}
        saving={saving}
        message={message}
        messageType={messageType}
        onTitleChange={setTitle}
        onEventIdChange={setEventId}
        onVenueChange={setVenue}
        onDescriptionChange={setDescription}
        onLateAfterMinutesChange={setLateAfterMinutes}
        onOpenPicker={openPicker}
        onPickerChange={onPickerChange}
        onQuickEnd={ms=>setEndDate(new Date(startDate.getTime()+ms))}
        onSave={()=>void saveEvent()}
        onCancel={resetForm}
      />

      {qrEvent?<EventQRCodeCard event={qrEvent}/>:null}

      <View style={styles.listHeader}>
        <View><Text style={styles.listTitle}>All Events</Text></View>
        {loading?<Text style={styles.loadingText}>Refreshing...</Text>:null}
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary}/>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search events or creator" placeholderTextColor={COLORS.textSecondary} style={styles.searchInput}/>
      </View>

      {filteredEvents.length===0&&!loading?<View style={styles.empty}><Ionicons name="calendar-outline" size={28} color={COLORS.primary}/><Text style={styles.emptyTitle}>No events found</Text><Text style={styles.emptyText}>Create an event above or change your search.</Text></View>:filteredEvents.map(event=><AdminEventCard key={event.id} event={event} onView={()=>setViewEvent(event)} onEdit={()=>editEvent(event)} onQr={()=>showQr(event)} onClose={()=>closeAdminEvent(event)}/>)}
    </ScrollView>

    <EventDetailsModal
      visible={!!viewEvent}
      event={viewEvent}
      creatorName={viewEvent?.creatorName}
      creatorEmail={viewEvent?.creatorEmail}
      attendanceCount={viewEvent?.attendeeCount}
      onClose={()=>setViewEvent(null)}
      onViewAttendance={()=>{
        if(!viewEvent)return;
        const id=viewEvent.id;
        setViewEvent(null);
        router.push({pathname:'/admin-attendance',params:{eventId:id}});
      }}
      onShowQr={()=>{
        if(!viewEvent)return;
        showQr(viewEvent);
        setViewEvent(null);
      }}
    />
  </SafeAreaView>;
}

function AdminEventCard({event,onView,onEdit,onQr,onClose}:{event:AdminEventRecord;onView:()=>void;onEdit:()=>void;onQr:()=>void;onClose:()=>void}){
  const status=getEventDisplayStatus(event);
  const active=status==='Upcoming'||status==='Ongoing';
  const date=event.start_time?new Date(event.start_time).toLocaleString([], {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'No schedule';

  return <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={styles.eventIcon}><Ionicons name="calendar-outline" size={20} color={COLORS.primary}/></View>
      <View style={styles.eventHeading}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventCode}>Code: {event.event_code}</Text></View>
      <View style={styles.badge}><Text style={styles.badgeText}>{status}</Text></View>
    </View>
    <Meta icon="person-outline" text={event.creatorName||event.creatorEmail||'Unknown creator'}/>
    <Meta icon="time-outline" text={date}/>
    <Meta icon="location-outline" text={event.venue||'No venue'}/>
    <View style={styles.summaryRow}><Text style={styles.summaryText}>{event.attendeeCount} attendance record{event.attendeeCount===1?'':'s'}</Text><Text style={styles.summaryText}>Late after {event.late_after_minutes??15} min</Text></View>
    <View style={styles.actions}>
      <Action icon="eye-outline" label="View" onPress={onView}/>
      <Action icon="create-outline" label="Edit" onPress={onEdit}/>
      {active?<Action icon="qr-code-outline" label="QR" onPress={onQr}/>:null}
      {event.status==='open'?<Action icon="close-circle-outline" label="Close" onPress={onClose} danger/>:null}
    </View>
  </View>;
}

function Meta({icon,text}:{icon:keyof typeof Ionicons.glyphMap;text:string}){return <View style={styles.meta}><Ionicons name={icon} size={14} color={COLORS.textSecondary}/><Text style={styles.metaText}>{text}</Text></View>}

function Action({icon,label,onPress,danger=false}:{icon:keyof typeof Ionicons.glyphMap;label:string;onPress:()=>void;danger?:boolean}){
  const color=danger?COLORS.danger:COLORS.primary;
  return <Pressable onPress={onPress} style={({pressed})=>[styles.action,danger&&styles.actionDanger,pressed&&styles.pressed]}><Ionicons name={icon} size={15} color={color}/><Text style={[styles.actionText,{color}]}>{label}</Text></Pressable>;
}

function AccessDenied(){
  return <SafeAreaView style={styles.safeArea} edges={['top']}><View style={styles.denied}><Ionicons name="shield-outline" size={36} color={COLORS.primary}/><Text style={styles.emptyTitle}>Admins only</Text><Text style={styles.emptyText}>This section is available only to Admin accounts.</Text></View></SafeAreaView>;
}

const styles=StyleSheet.create({
  safeArea:{flex:1,backgroundColor:COLORS.navy},
  container:{flex:1,backgroundColor:COLORS.background},
  content:{paddingHorizontal:20,paddingTop:12,paddingBottom:110},
  listHeader:{marginTop:8,marginBottom:11,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:10},
  listTitle:{fontSize:19,fontWeight:'800',color:COLORS.textPrimary},
  loadingText:{fontSize:9.5,color:COLORS.textSecondary},
  searchBox:{minHeight:46,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:COLORS.border,borderRadius:15,backgroundColor:COLORS.card,paddingHorizontal:12,marginBottom:11},
  searchInput:{flex:1,fontSize:12.5,color:COLORS.textPrimary},
  card:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:20,padding:14,marginBottom:11},
  cardTop:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:6},
  eventIcon:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  eventHeading:{flex:1,minWidth:0},
  eventTitle:{fontSize:14,fontWeight:'800',color:COLORS.textPrimary},
  eventCode:{marginTop:3,fontSize:10,fontWeight:'700',color:COLORS.primary},
  badge:{borderRadius:999,backgroundColor:COLORS.primarySoft,paddingHorizontal:8,paddingVertical:5},
  badgeText:{fontSize:9,fontWeight:'800',color:COLORS.primary},
  meta:{flexDirection:'row',alignItems:'center',gap:6,marginTop:7},
  metaText:{flex:1,fontSize:10.5,color:COLORS.textSecondary},
  summaryRow:{flexDirection:'row',justifyContent:'space-between',gap:8,marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:COLORS.border},
  summaryText:{fontSize:9.5,fontWeight:'700',color:COLORS.textSecondary},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:11},
  action:{minHeight:34,flexDirection:'row',alignItems:'center',gap:5,borderRadius:999,backgroundColor:COLORS.primarySoft,paddingHorizontal:11,paddingVertical:7},
  actionDanger:{backgroundColor:COLORS.dangerSoft},
  actionText:{fontSize:10.5,fontWeight:'800'},
  pressed:{opacity:.75},
  empty:{minHeight:180,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:20,padding:20},
  emptyTitle:{marginTop:10,fontSize:15,fontWeight:'800',color:COLORS.textPrimary},
  emptyText:{marginTop:5,fontSize:11,lineHeight:17,color:COLORS.textSecondary,textAlign:'center'},
  denied:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.background,paddingHorizontal:28},
});
