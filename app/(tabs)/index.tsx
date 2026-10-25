import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminHome from '@/components/admin/AdminHome';
import { COLORS } from '@/constants/colors';
import { getAttendanceHistory, getTeacherEventAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { getEventDisplayStatus, getEventsByTeacher, getStudentEvents } from '@/lib/events';
import { useCachedProfile } from '@/lib/profile-cache';

type HomeStats = {
  first: number;
  second: number;
  third: number;
};

const EMPTY_STATS:HomeStats={first:0,second:0,third:0};

export default function Index() {
  const { user } = useAuth();
  const { profile } = useCachedProfile(user?.id);
  const isTeacher = profile?.role === 'teacher';
  const isAdmin = profile?.role === 'admin';
  const [stats,setStats]=useState<HomeStats>(EMPTY_STATS);

  const loadStats=useCallback(async()=>{
    if(!user||!profile||profile.role==='admin')return;

    if(profile.role==='teacher'){
      const[events,attendance]=await Promise.all([
        getEventsByTeacher(user.id),
        getTeacherEventAttendance(user.id),
      ]);

      setStats({
        first:events.length,
        second:events.filter(event=>getEventDisplayStatus(event)==='Ongoing').length,
        third:attendance.reduce((total,event)=>total+event.attendeeCount,0),
      });
      return;
    }

    const[events,history]=await Promise.all([
      getStudentEvents(),
      getAttendanceHistory(user.id),
    ]);

    setStats({
      first:events.filter(event=>getEventDisplayStatus(event)==='Upcoming').length,
      second:history.length,
      third:history.filter(record=>record.status==='late').length,
    });
  },[user?.id,profile?.role]);

  useFocusEffect(useCallback(()=>{void loadStats()},[loadStats]));

  const summary=isTeacher?[
    {label:'My Events',value:stats.first,icon:'calendar-outline' as const},
    {label:'Ongoing',value:stats.second,icon:'radio-button-on-outline' as const},
    {label:'Attendance',value:stats.third,icon:'people-outline' as const},
  ]:[
    {label:'Upcoming',value:stats.first,icon:'calendar-outline' as const},
    {label:'Attendance',value:stats.second,icon:'checkmark-done-outline' as const},
    {label:'Late',value:stats.third,icon:'time-outline' as const},
  ];

  if (isAdmin) {
    return <AdminHome />;
  }


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.glowLarge}/><View style={styles.glowSmall}/>
          <View style={styles.heroTop}>
            <View style={styles.brandRow}>
              <View style={styles.logoShell}><Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain"/></View>
              <View style={styles.brandCopy}><Text style={styles.brandTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>QR Attendance</Text></View>
            </View>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.full_name?.trim()?.[0] || 'U').toUpperCase()}</Text></View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.summaryRow}>
            {summary.map(item=><SummaryCard key={item.label} {...item}/>)}
          </View>

          <Pressable onPress={() => router.push(isTeacher ? '/teacher' : '/scan')} style={({pressed}) => [styles.mainAction,pressed&&styles.pressed]}>
            <View style={styles.mainActionIcon}><Ionicons name={isTeacher ? 'calendar-outline' : 'scan-outline'} size={30} color={COLORS.primary}/></View>
            <View style={styles.mainActionText}>
              <Text style={styles.mainActionTitle}>{isTeacher ? 'Manage Events' : 'Scan QR Code'}</Text>
              <Text style={styles.mainActionSubtitle}>{isTeacher ? 'Create, edit, close, and display your event QR codes.' : 'Record your attendance at school events.'}</Text>
            </View>
            <View style={styles.actionArrow}><Ionicons name="arrow-forward-outline" size={20} color="#FFFFFF"/></View>
          </Pressable>

          <View style={[styles.quickGrid,isTeacher&&styles.teacherQuickGrid]}>
            {!isTeacher ? <QuickAction title="Events" subtitle="Browse school events" icon="calendar-outline" onPress={() => router.push('/events')}/> : null}
            <QuickAction title={isTeacher?'Attendance':'History'} subtitle={isTeacher ? 'Monitor event attendance' : 'View your attendance'} icon="time-outline" onPress={() => router.push('/history')}/>
            <QuickAction title="Profile" subtitle="Your account information" icon="person-outline" onPress={() => router.push('/profile')}/>
          </View>

          {!isTeacher ? <Pressable accessibilityRole="button" onPress={()=>router.push('/passport')} style={({pressed})=>[styles.passportBanner,pressed&&styles.pressed]}><View style={styles.passportBannerIcon}><Ionicons name="book-outline" size={25} color={COLORS.primary}/></View><View style={{flex:1}}><Text style={styles.passportBannerTitle}>My Event Passport</Text><Text style={styles.passportBannerSubtitle}>Collect stamps from your campus events</Text></View><Ionicons name="chevron-forward" size={19} color={COLORS.primary}/></Pressable> : null}
          <View style={styles.infoCard}>
            <View style={styles.infoArt}><Ionicons name={isTeacher ? 'people-outline' : 'scan-outline'} size={30} color={COLORS.primary}/></View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>How it works?</Text>
              <Text style={styles.infoCopy}>{isTeacher ? 'Create an event, show its QR code, then monitor the attendee list live from Attendance.' : 'Scan the QR code provided at school events. Browse available events and review your attendance history anytime.'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({label,value,icon}:{label:string;value:number;icon:keyof typeof Ionicons.glyphMap}){
  return <View style={styles.summaryCard}><View style={styles.summaryIcon}><Ionicons name={icon} size={17} color={COLORS.primary}/></View><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

type QuickActionProps={title:string;subtitle:string;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void};
function QuickAction({title,subtitle,icon,onPress}:QuickActionProps){
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>[styles.quickCard,pressed&&styles.pressed]}>
    <View style={styles.quickIcon}><Ionicons name={icon} size={22} color={COLORS.primary}/></View>
    <Text style={styles.quickTitle}>{title}</Text>
    <Text style={styles.quickSubtitle}>{subtitle}</Text>
  </Pressable>;
}

const styles=StyleSheet.create({
  safeArea:{flex:1,backgroundColor:COLORS.navy},container:{flex:1,backgroundColor:COLORS.background},content:{paddingBottom:104},
  hero:{minHeight:114,backgroundColor:COLORS.navy,paddingHorizontal:20,paddingTop:14,paddingBottom:18,overflow:'hidden'},
  glowLarge:{position:'absolute',width:170,height:170,borderRadius:85,backgroundColor:'#2148CC',right:-88,bottom:-115},glowSmall:{position:'absolute',width:108,height:108,borderRadius:54,backgroundColor:'#376BFF',right:40,bottom:-79,opacity:.65},
  heroTop:{flexDirection:'row',alignItems:'center',gap:10},brandRow:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:11},logoShell:{width:44,height:44,borderRadius:14,backgroundColor:'rgba(255,255,255,.1)',alignItems:'center',justifyContent:'center'},logo:{width:32,height:32},brandCopy:{flex:1,minWidth:0},brandTitle:{color:'#fff',fontSize:17,fontWeight:'800',letterSpacing:-.3},avatar:{width:40,height:40,flexShrink:0,borderRadius:20,backgroundColor:'#EEF3FF',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'rgba(255,255,255,.35)'},avatarText:{color:COLORS.primaryStrong,fontWeight:'800'},
  body:{paddingHorizontal:16,marginTop:-20},
  summaryRow:{flexDirection:'row',gap:8,marginBottom:10},
  summaryCard:{flex:1,minHeight:84,backgroundColor:'#fff',borderWidth:1,borderColor:COLORS.border,borderRadius:17,padding:10},
  summaryIcon:{width:29,height:29,borderRadius:10,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  summaryValue:{marginTop:6,fontSize:18,fontWeight:'900',color:COLORS.textPrimary},
  summaryLabel:{marginTop:1,fontSize:8.5,fontWeight:'700',color:COLORS.textSecondary},
  mainAction:{backgroundColor:COLORS.primary,borderRadius:24,padding:16,flexDirection:'row',alignItems:'center',gap:14,shadowColor:COLORS.primary,shadowOpacity:.24,shadowRadius:20,shadowOffset:{width:0,height:10},elevation:5},mainActionIcon:{width:62,height:62,borderRadius:18,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},mainActionText:{flex:1},mainActionTitle:{color:'#fff',fontSize:18,fontWeight:'800'},mainActionSubtitle:{marginTop:4,color:'#EAF0FF',fontSize:11,lineHeight:16},actionArrow:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'},
  quickGrid:{flexDirection:'row',gap:10,marginTop:12},teacherQuickGrid:{justifyContent:'center'},quickCard:{flex:1,minHeight:132,backgroundColor:'#fff',borderWidth:1,borderColor:COLORS.border,borderRadius:20,padding:14,shadowColor:COLORS.shadow,shadowOpacity:.035,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:1},quickIcon:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:15},quickTitle:{fontSize:14,fontWeight:'800',color:COLORS.textPrimary},quickSubtitle:{marginTop:5,fontSize:10,lineHeight:15,color:COLORS.textSecondary},
  passportBanner:{marginTop:12,padding:14,borderRadius:18,backgroundColor:'#F1F4FF',borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:12},passportBannerIcon:{width:46,height:46,backgroundColor:'#FFFFFF',borderRadius:14,alignItems:'center',justifyContent:'center'},passportBannerTitle:{fontSize:13,fontWeight:'900',color:COLORS.textPrimary},passportBannerSubtitle:{fontSize:10,color:COLORS.textSecondary,marginTop:3},infoCard:{marginTop:12,backgroundColor:'#fff',borderWidth:1,borderColor:COLORS.border,borderRadius:20,padding:14,flexDirection:'row',alignItems:'center',gap:13},infoArt:{width:72,height:72,borderRadius:18,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},infoText:{flex:1},infoTitle:{fontSize:13,fontWeight:'800',color:COLORS.textPrimary},infoCopy:{marginTop:5,fontSize:10.5,lineHeight:16,color:COLORS.textSecondary},pressed:{opacity:.82,transform:[{scale:.99}]},
});
