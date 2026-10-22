import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { useCachedProfile } from '@/lib/profile-cache';

export default function Index() {
  const { user } = useAuth();
  const { profile } = useCachedProfile(user?.id);
  const isTeacher = profile?.role === 'teacher';
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || (isTeacher ? 'Teacher' : 'there');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.glowLarge}/><View style={styles.glowSmall}/>
          <View style={styles.heroTop}>
            <View style={styles.brandRow}>
              <View style={styles.logoShell}><Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain"/></View>
              <View><Text style={styles.brandTitle}>QR Attendance</Text><Text style={styles.brandSub}>QR-Ybanez</Text></View>
            </View>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.full_name?.trim()?.[0] || 'U').toUpperCase()}</Text></View>
          </View>
          <Text style={styles.eyebrow}>School Event Attendance</Text>
          <Text style={styles.heroTitle}>Hi, {firstName}!</Text>
          <Text style={styles.heroSubtitle}>{isTeacher ? 'Create events, display QR codes, and review student attendance for your classes and activities.' : 'Scan event QR codes and keep track of your school event attendance.'}</Text>
        </View>

        <View style={styles.body}>
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
            <QuickAction title="History" subtitle={isTeacher ? 'View event attendance' : 'View your attendance'} icon="time-outline" onPress={() => router.push('/history')}/>
            <QuickAction title="Profile" subtitle="Your account information" icon="person-outline" onPress={() => router.push('/profile')}/>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoArt}><Ionicons name={isTeacher ? 'qr-code-outline' : 'scan-outline'} size={30} color={COLORS.primary}/></View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>How it works?</Text>
              <Text style={styles.infoCopy}>{isTeacher ? 'Create an event, show its QR code to students, then review recorded attendance in History.' : 'Scan the QR code provided at school events. Browse available events and review your attendance history anytime.'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  hero:{minHeight:270,backgroundColor:COLORS.navy,paddingHorizontal:20,paddingTop:18,paddingBottom:50,overflow:'hidden'},
  glowLarge:{position:'absolute',width:250,height:250,borderRadius:125,backgroundColor:'#2148CC',right:-110,bottom:-110},glowSmall:{position:'absolute',width:160,height:160,borderRadius:80,backgroundColor:'#376BFF',right:44,bottom:-98,opacity:.8},
  heroTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brandRow:{flexDirection:'row',alignItems:'center',gap:11},logoShell:{width:44,height:44,borderRadius:14,backgroundColor:'rgba(255,255,255,.1)',alignItems:'center',justifyContent:'center'},logo:{width:32,height:32},brandTitle:{color:'#fff',fontSize:14,fontWeight:'800'},brandSub:{color:'#9FAACA',fontSize:11,fontWeight:'600',marginTop:2},avatar:{width:40,height:40,borderRadius:20,backgroundColor:'#EEF3FF',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'rgba(255,255,255,.35)'},avatarText:{color:COLORS.primaryStrong,fontWeight:'800'},
  eyebrow:{marginTop:27,color:'#97A5C8',fontSize:11,fontWeight:'700',textTransform:'uppercase',letterSpacing:.8},heroTitle:{marginTop:7,color:'#fff',fontSize:30,fontWeight:'800',letterSpacing:-.8},heroSubtitle:{marginTop:8,maxWidth:310,color:'#C1CAE1',fontSize:13,lineHeight:19},
  body:{paddingHorizontal:16,marginTop:-26},mainAction:{backgroundColor:COLORS.primary,borderRadius:24,padding:16,flexDirection:'row',alignItems:'center',gap:14,shadowColor:COLORS.primary,shadowOpacity:.24,shadowRadius:20,shadowOffset:{width:0,height:10},elevation:5},mainActionIcon:{width:62,height:62,borderRadius:18,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},mainActionText:{flex:1},mainActionTitle:{color:'#fff',fontSize:18,fontWeight:'800'},mainActionSubtitle:{marginTop:4,color:'#EAF0FF',fontSize:11,lineHeight:16},actionArrow:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'},
  quickGrid:{flexDirection:'row',gap:10,marginTop:12},teacherQuickGrid:{justifyContent:'center'},quickCard:{flex:1,minHeight:132,backgroundColor:'#fff',borderWidth:1,borderColor:COLORS.border,borderRadius:20,padding:14,shadowColor:COLORS.shadow,shadowOpacity:.035,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:1},quickIcon:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:15},quickTitle:{fontSize:14,fontWeight:'800',color:COLORS.textPrimary},quickSubtitle:{marginTop:5,fontSize:10,lineHeight:15,color:COLORS.textSecondary},
  infoCard:{marginTop:12,backgroundColor:'#fff',borderWidth:1,borderColor:COLORS.border,borderRadius:20,padding:14,flexDirection:'row',alignItems:'center',gap:13},infoArt:{width:72,height:72,borderRadius:18,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},infoText:{flex:1},infoTitle:{fontSize:13,fontWeight:'800',color:COLORS.textPrimary},infoCopy:{marginTop:5,fontSize:10.5,lineHeight:16,color:COLORS.textSecondary},pressed:{opacity:.82,transform:[{scale:.99}]},
});
