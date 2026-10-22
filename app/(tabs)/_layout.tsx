import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '@/components/AppButton';
import SplashLoader from '@/components/SplashLoader';
import { COLORS } from '@/constants/colors';
import { getAttendanceHistory,getTeacherEventAttendance } from '@/lib/attendance';
import { signOut,useAuth } from '@/lib/auth';
import { getEventsByTeacher,getStudentEvents } from '@/lib/events';
import { refreshCachedProfile,useCachedProfile } from '@/lib/profile-cache';

export default function TabLayout(){
  const {user}=useAuth();
  const insets=useSafeAreaInsets();
  const{profile,loading:profileLoading,error:profileError}=useCachedProfile(user?.id);

  useEffect(()=>{
    if(!user||!profile)return;

    if(profile.role==='student'){
      void Promise.all([
        getStudentEvents(),
        getAttendanceHistory(user.id),
      ]);
      return;
    }

    if(profile.role==='teacher'){
      void Promise.all([
        getEventsByTeacher(user.id),
        getTeacherEventAttendance(user.id),
      ]);
    }
  },[user?.id,profile?.role]);

  if(user&&profileLoading)return <SplashLoader/>;

  if(user&&!profile){
    const missingProfile=profileError==='Profile record was not found.';
    return <View style={styles.errorScreen}>
      <View style={styles.errorIcon}>
        <Ionicons name={missingProfile?'person-remove-outline':'cloud-offline-outline'} size={30} color={COLORS.primary}/>
      </View>
      <Text style={styles.errorTitle}>Unable to load profile</Text>
      <Text style={styles.errorText}>{missingProfile?'Your account profile could not be found. Try signing in again.':'We could not load your profile. Check your connection and try again.'}</Text>
      <View style={styles.errorActions}>
        <AppButton theme="primary" title="Retry" icon="refresh-outline" onPress={()=>{if(user)void refreshCachedProfile(user.id)}}/>
        <AppButton variant="secondary" title="Sign Out" icon="log-out-outline" onPress={()=>void signOut()}/>
      </View>
    </View>;
  }

  const isStudent=profile?.role==='student';
  const isTeacher=profile?.role==='teacher';
  const isAdmin=profile?.role==='admin';
  const bottomPadding=Math.max(insets.bottom,10);

  return <Tabs screenOptions={{
    headerShown:false,
    tabBarHideOnKeyboard:true,
    tabBarActiveTintColor:COLORS.primary,
    tabBarInactiveTintColor:'#8B96AD',
    tabBarLabelStyle:{fontSize:10,fontWeight:'700',marginTop:2,lineHeight:12},
    tabBarStyle:{
      backgroundColor:COLORS.card,
      borderTopColor:COLORS.border,
      borderTopWidth:1,
      height:60+bottomPadding,
      paddingTop:7,
      paddingBottom:bottomPadding,
      shadowColor:COLORS.shadow,
      shadowOpacity:.05,
      shadowRadius:14,
      shadowOffset:{width:0,height:-5},
      elevation:9,
    },
  }}>
    <Tabs.Screen name="index" options={{title:'Home',tabBarIcon:({color,focused})=><Ionicons name={focused?'home':'home-outline'} color={color} size={23}/>}}/>
    <Tabs.Screen name="events" options={{title:'Events',href:isStudent?undefined:null,tabBarIcon:({color,focused})=><Ionicons name={focused?'calendar':'calendar-outline'} color={color} size={23}/>}}/>
    <Tabs.Screen name="scan" options={{title:'Scan',href:isStudent?undefined:null,tabBarIcon:({color,focused})=><Ionicons name={focused?'qr-code':'qr-code-outline'} color={color} size={23}/>}}/>
    <Tabs.Screen name="history" options={{title:isTeacher?'Attendance':'History',href:isAdmin?null:undefined,tabBarIcon:({color,focused})=><Ionicons name={isTeacher?(focused?'people':'people-outline'):(focused?'time':'time-outline')} color={color} size={23}/>}}/>
    <Tabs.Screen name="teacher" options={{title:'Manage',href:isTeacher?undefined:null,tabBarIcon:({color,focused})=><Ionicons name={focused?'calendar':'calendar-outline'} color={color} size={23}/>}}/>
    <Tabs.Screen name="admin-users" options={{title:'Users',href:isAdmin?undefined:null,tabBarIcon:({color,focused})=><Ionicons name={focused?'people':'people-outline'} color={color} size={23}/>}}/>
    <Tabs.Screen name="admin-events" options={{title:'Events',href:isAdmin?undefined:null,tabBarIcon:({color,focused})=><Ionicons name={focused?'calendar':'calendar-outline'} color={color} size={23}/>}}/>
    <Tabs.Screen name="admin-attendance" options={{title:'Attendance',href:isAdmin?undefined:null,tabBarItemStyle:{flex:1.5},tabBarIcon:({color,focused})=><Ionicons name={focused?'checkmark-done-circle':'checkmark-done-circle-outline'} color={color} size={23}/>}}/>
    <Tabs.Screen name="admin-reports" options={{title:'Reports',href:null}}/>
    <Tabs.Screen name="profile" options={{title:'Profile',tabBarIcon:({color,focused})=><Ionicons name={focused?'person':'person-outline'} color={color} size={23}/>}}/>
  </Tabs>;
}

const styles=StyleSheet.create({
  errorScreen:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:28,backgroundColor:COLORS.background},
  errorIcon:{width:68,height:68,borderRadius:22,alignItems:'center',justifyContent:'center',marginBottom:18,backgroundColor:COLORS.primarySoft,borderWidth:1,borderColor:COLORS.border},
  errorTitle:{fontSize:20,fontWeight:'800',color:COLORS.textPrimary,textAlign:'center'},
  errorText:{marginTop:8,fontSize:13,lineHeight:20,color:COLORS.textSecondary,textAlign:'center',maxWidth:360},
  errorActions:{width:'100%',maxWidth:320,marginTop:20},
});
