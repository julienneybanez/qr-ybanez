import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet,Text,View } from 'react-native';
import { COLORS } from '@/constants/colors';
type Props={userId?:string|null};
export default function SystemAccountId({userId}:Props){return <><Text style={styles.sectionLabel}>System Account ID</Text><View style={styles.idCard}><View style={styles.icon}><Ionicons name="finger-print-outline" size={19} color={COLORS.primary}/></View><Text style={styles.userId} numberOfLines={1}>{userId??'—'}</Text></View></>}
const styles=StyleSheet.create({sectionLabel:{marginBottom:8,fontSize:11,fontWeight:'800',color:COLORS.textSecondary,textTransform:'uppercase',letterSpacing:.8},idCard:{flexDirection:'row',alignItems:'center',gap:11,backgroundColor:'#fff',borderWidth:1,borderColor:COLORS.border,borderRadius:18,paddingHorizontal:13,paddingVertical:12},icon:{width:38,height:38,borderRadius:12,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},userId:{flex:1,color:COLORS.textSecondary,fontSize:11}});
