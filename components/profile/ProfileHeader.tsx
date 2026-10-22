import { StyleSheet,Text,View } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { Role } from '@/lib/profiles';

type Props={initials:string;name:string|null|undefined;role:Role|undefined};

function getRoleLabel(role: Role | undefined) {
  if (role === 'admin') return 'Admin';
  if (role === 'teacher') return 'Teacher';
  return 'Student';
}

export default function ProfileHeader({initials,name,role}:Props){
  return <View style={styles.profileHeader}><View style={styles.decorLeft}/><View style={styles.decorRight}/><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><Text style={styles.profileName}>{name||'Your name'}</Text><View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{getRoleLabel(role)}</Text></View></View>;
}

const styles=StyleSheet.create({profileHeader:{alignItems:'center',paddingTop:22,paddingBottom:20,overflow:'hidden'},decorLeft:{position:'absolute',width:110,height:110,borderRadius:55,backgroundColor:'#EAF1FF',left:-60,top:28},decorRight:{position:'absolute',width:145,height:145,borderRadius:73,backgroundColor:'#EDF3FF',right:-72,top:54},avatar:{width:86,height:86,borderRadius:43,backgroundColor:'#fff',borderWidth:4,borderColor:'#fff',alignItems:'center',justifyContent:'center',marginBottom:11,shadowColor:COLORS.shadow,shadowOpacity:.08,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:3},avatarText:{color:COLORS.primary,fontSize:29,fontWeight:'800'},profileName:{fontSize:19,fontWeight:'800',color:COLORS.textPrimary,textAlign:'center'},roleBadge:{marginTop:8,borderRadius:999,backgroundColor:COLORS.primarySoft,paddingHorizontal:12,paddingVertical:5},roleBadgeText:{fontSize:11,fontWeight:'800',color:COLORS.primary}});
