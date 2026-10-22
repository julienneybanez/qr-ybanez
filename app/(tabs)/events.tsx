import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventsState from '@/components/events/EventsState';
import StudentCorrectionModal from '@/components/attendance/StudentCorrectionModal';
import StudentEventCard from '@/components/events/StudentEventCard';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getEventDisplayStatus,
  getStudentEvents,
  peekStudentEvents,
  type CloudEvent,
  type EventDisplayStatus,
} from '@/lib/events';
import { useCachedProfile } from '@/lib/profile-cache';

type Filter='all'|'Ongoing'|'Upcoming'|'Ended';

export default function EventsScreen(){
  const {user}=useAuth();
  const {profile}=useCachedProfile(user?.id);
  const cachedEvents=peekStudentEvents();
  const [events,setEvents]=useState<CloudEvent[]>(()=>cachedEvents??[]);
  const [loading,setLoading]=useState(()=>cachedEvents===null);
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<Filter>('all');
  const [reportEvent,setReportEvent]=useState<CloudEvent|null>(null);

  const refreshEvents=useCallback(async()=>{
    if(profile?.role!=='student')return;
    const cached=peekStudentEvents();
    if(cached){setEvents(cached);setLoading(false)}else setLoading(true);
    const rows=await getStudentEvents();
    setEvents(rows);
    setLoading(false);
  },[profile?.role]);

  useFocusEffect(useCallback(()=>{void refreshEvents()},[refreshEvents]));

  const sortedEvents=useMemo(()=>{
    const rank:Record<EventDisplayStatus,number>={Ongoing:0,Upcoming:1,Ended:2,Closed:3};
    return [...events].sort((a,b)=>{
      const sa=getEventDisplayStatus(a),sb=getEventDisplayStatus(b);
      const d=rank[sa]-rank[sb];
      if(d!==0)return d;
      return (a.start_time?new Date(a.start_time).getTime():Number.MAX_SAFE_INTEGER)-(b.start_time?new Date(b.start_time).getTime():Number.MAX_SAFE_INTEGER);
    });
  },[events]);

  const visibleEvents=useMemo(()=>{
    const needle=query.trim().toLowerCase();

    return sortedEvents.filter(event=>{
      const status=getEventDisplayStatus(event);
      const matchesFilter=filter==='all'||status===filter;
      const matchesSearch=
        !needle||
        event.title.toLowerCase().includes(needle)||
        event.event_code.toLowerCase().includes(needle)||
        event.venue?.toLowerCase().includes(needle);

      return matchesFilter&&matchesSearch;
    });
  },[sortedEvents,query,filter]);

  if(loading&&events.length===0)return <SafeAreaView style={styles.safeArea} edges={['top']}><PageHeader title="Events"/><EventsState loading message="Loading events..."/></SafeAreaView>;

  if(profile?.role!=='student')return <SafeAreaView style={styles.safeArea} edges={['top']}><PageHeader title="Events"/><EventsState icon="school-outline" title="Students only" message="Student accounts can browse school events here."/></SafeAreaView>;

  return <SafeAreaView style={styles.safeArea} edges={['top']}>
    <PageHeader title="Events"/>
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary}/>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search event, code, or venue" placeholderTextColor={COLORS.textSecondary} style={styles.searchInput}/>
      </View>

      <View style={styles.filters}>
        {(['all','Ongoing','Upcoming','Ended'] as Filter[]).map(value=><Pressable key={value} onPress={()=>setFilter(value)} style={[styles.filterChip,filter===value&&styles.filterChipActive]}>
          <Text style={[styles.filterText,filter===value&&styles.filterTextActive]}>{value==='all'?'All':value}</Text>
        </Pressable>)}
      </View>

      {visibleEvents.length===0?
        <EventsState icon="calendar-outline" title="No events found" message="Try another search or event filter."/>:
        <FlatList data={visibleEvents} keyExtractor={item=>item.id} renderItem={({item})=><StudentEventCard event={item} onReportMissing={()=>setReportEvent(item)}/>} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}/>}
    </View>
    <StudentCorrectionModal visible={!!reportEvent} studentId={user?.id??''} initialEventId={reportEvent?.id} onClose={()=>setReportEvent(null)}/>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safeArea:{flex:1,backgroundColor:COLORS.navy},
  container:{flex:1,backgroundColor:COLORS.background,paddingHorizontal:16,paddingTop:14},
  searchBox:{minHeight:46,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,borderRadius:15,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border},
  searchInput:{flex:1,fontSize:12.5,color:COLORS.textPrimary},
  filters:{flexDirection:'row',gap:7,marginTop:9,marginBottom:11},
  filterChip:{flex:1,minHeight:34,borderRadius:999,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  filterChipActive:{backgroundColor:COLORS.primarySoft,borderColor:'#9DB0FF'},
  filterText:{fontSize:9.5,fontWeight:'700',color:COLORS.textSecondary},
  filterTextActive:{color:COLORS.primary},
  list:{paddingBottom:104},
});
