import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventsState from '@/components/events/EventsState';
import StudentEventCard from '@/components/events/StudentEventCard';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getEventDisplayStatus,getStudentEvents,peekStudentEvents,type CloudEvent,type EventDisplayStatus } from '@/lib/events';
import { useCachedProfile } from '@/lib/profile-cache';

export default function EventsScreen(){
  const {user}=useAuth(); const {profile}=useCachedProfile(user?.id); const cachedEvents=peekStudentEvents();
  const [events,setEvents]=useState<CloudEvent[]>(()=>cachedEvents??[]); const [loading,setLoading]=useState(()=>cachedEvents===null);
  const refreshEvents=useCallback(async()=>{if(profile?.role!=='student')return;const cached=peekStudentEvents();if(cached){setEvents(cached);setLoading(false)}else setLoading(true);const rows=await getStudentEvents();setEvents(rows);setLoading(false)},[profile?.role]);
  useFocusEffect(useCallback(()=>{void refreshEvents()},[refreshEvents]));
  const sortedEvents=useMemo(()=>{const rank:Record<EventDisplayStatus,number>={Ongoing:0,Upcoming:1,Ended:2,Closed:3};return[...events].sort((a,b)=>{const sa=getEventDisplayStatus(a),sb=getEventDisplayStatus(b);const d=rank[sa]-rank[sb];if(d!==0)return d;return (a.start_time?new Date(a.start_time).getTime():Number.MAX_SAFE_INTEGER)-(b.start_time?new Date(b.start_time).getTime():Number.MAX_SAFE_INTEGER)})},[events]);
  if(loading&&events.length===0)return <SafeAreaView style={styles.safeArea} edges={['top']}><PageHeader title="Events" subtitle="Browse school events and see their current status."/><EventsState loading message="Loading events..."/></SafeAreaView>;
  if(profile?.role!=='student')return <SafeAreaView style={styles.safeArea} edges={['top']}><PageHeader title="Events"/><EventsState icon="school-outline" title="Students only" message="Student accounts can browse school events here."/></SafeAreaView>;
  return <SafeAreaView style={styles.safeArea} edges={['top']}><PageHeader title="Events" subtitle="View upcoming, ongoing, and recently ended school events."/><View style={styles.container}>{sortedEvents.length===0?<EventsState icon="calendar-outline" title="No events available" message="Open school events will appear here once a teacher creates them."/>:<FlatList data={sortedEvents} keyExtractor={item=>item.id} renderItem={({item})=><StudentEventCard event={item}/>} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}/>}</View></SafeAreaView>;
}
const styles=StyleSheet.create({safeArea:{flex:1,backgroundColor:COLORS.navy},container:{flex:1,backgroundColor:COLORS.background,paddingHorizontal:16,paddingTop:14},list:{paddingBottom:104}});
