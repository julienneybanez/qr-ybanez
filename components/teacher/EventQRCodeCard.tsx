import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '@/constants/colors';
import type { CloudEvent } from '@/lib/events';
import { buildQRPayload } from '@/lib/qr';
import { issueEventToken, type IssuedEventToken } from '@/lib/secure-attendance';
import { formatDateTime } from './formatDateTime';

type Props={event:CloudEvent};

export default function EventQRCodeCard({event}:Props){
  const [issued,setIssued]=useState<IssuedEventToken|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [now,setNow]=useState(Date.now());
  const [serverOffset,setServerOffset]=useState(0);
  const isFocused=useIsFocused();

  useEffect(()=>{
    if(!isFocused){setIssued(null);return;}
    let active=true;
    let inFlight=false;

    const refresh=async()=>{
      if(inFlight)return;
      inFlight=true;
      const result=await issueEventToken(event.id);
      inFlight=false;
      if(!active)return;
      setIssued(result.data);
      if(result.data)setServerOffset(new Date(result.data.server_now).getTime()-Date.now());
      setError(result.error);
      setLoading(false);
      setNow(Date.now());
    };

    setIssued(null);
    setError(null);
    setLoading(true);
    void refresh();
    const refreshTimer=setInterval(()=>void refresh(),30000);
    const clock=setInterval(()=>setNow(Date.now()),1000);

    return()=>{
      active=false;
      clearInterval(refreshTimer);
      clearInterval(clock);
    };
  },[event.id,isFocused]);

  const expires=issued?new Date(issued.expires_at).getTime():0;
  const timeRemaining=Math.max(0,Math.ceil((expires-now-serverOffset)/1000));
  const valid=Boolean(issued&&timeRemaining>0&&!error);

  return <View style={styles.qrCard}>
    <View style={styles.header}>
      <View style={styles.titleBox}>
        <Text style={styles.qrTitle}>Live Event QR</Text>
        <Text style={styles.qrEventTitle}>{event.title}</Text>
        <Text style={styles.qrEventCode}>{event.event_code}</Text>
      </View>
      <View style={styles.liveTag}><Ionicons name="shield-checkmark" size={14} color={COLORS.primary}/><Text style={styles.liveText}>Secure</Text></View>
    </View>
    {event.venue?<View style={styles.metaRow}><Ionicons name="location-outline" size={15} color={COLORS.textSecondary}/><Text style={styles.qrSchedule}>{event.venue}</Text></View>:null}
    {event.start_time&&event.end_time?<View style={styles.metaRow}><Ionicons name="time-outline" size={15} color={COLORS.textSecondary}/><Text style={styles.qrSchedule}>{formatDateTime(new Date(event.start_time))} – {formatDateTime(new Date(event.end_time))}</Text></View>:null}
    <View style={styles.metaRow}><Ionicons name="timer-outline" size={15} color={COLORS.textSecondary}/><Text style={styles.qrSchedule}>Late after {event.late_after_minutes??15} minutes</Text></View>

    <View style={styles.qrBox}>
      {valid&&issued?
        <QRCode value={buildQRPayload(issued.event,issued.token)} size={190} key={issued.token}/>:
        <View style={styles.qrPlaceholder}>
          {loading?<ActivityIndicator color={COLORS.primary} size="large"/>:<Ionicons name={error?'cloud-offline-outline':'refresh-outline'} size={28} color={COLORS.primary}/>}
          <Text style={styles.placeholderText}>{loading?'Generating secure QR...':error??'Refreshing the QR code...'}</Text>
        </View>}
    </View>

    <View style={styles.refreshRow}>
      <Ionicons name="refresh-cw" size={15} color={COLORS.primary}/>
      <Text style={styles.refreshLabel}>{valid?'Code expires in '+timeRemaining+'s':'Waiting for current code'}</Text>
    </View>
    <View style={styles.progress}><View style={[styles.progressInner,{width:(Math.min(40,timeRemaining)/40*100)+'%'}]}/></View>
    <Text style={styles.note}>The QR refreshes every 30 seconds. Screenshots of expired codes cannot be used.</Text>
    {error?<Pressable onPress={()=>{setLoading(true);setError(null);void issueEventToken(event.id).then(r=>{setIssued(r.data);setError(r.error);setLoading(false);setNow(Date.now())})}} style={styles.retry}><Ionicons name="refresh-outline" size={15} color={COLORS.primary}/><Text style={styles.retryText}>Retry now</Text></Pressable>:null}
  </View>;
}
const styles=StyleSheet.create({
  qrCard:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:20,padding:15,marginTop:12,marginBottom:24},
  header:{flexDirection:'row',alignItems:'flex-start',gap:10},titleBox:{flex:1},
  qrTitle:{fontSize:16,fontWeight:'800',color:COLORS.textPrimary},
  qrEventTitle:{fontSize:13.5,fontWeight:'800',color:COLORS.textPrimary,marginTop:7},
  qrEventCode:{marginTop:3,fontSize:10.5,fontWeight:'700',color:COLORS.primary},
  liveTag:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.primarySoft,borderRadius:999,paddingHorizontal:9,paddingVertical:6},
  liveText:{fontSize:9,fontWeight:'800',color:COLORS.primary},
  metaRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:7},
  qrSchedule:{flex:1,fontSize:10.5,lineHeight:15,color:COLORS.textSecondary},
  qrBox:{alignSelf:'center',backgroundColor:'#FFFFFF',padding:18,borderRadius:18,marginTop:18,marginBottom:13,minHeight:226,minWidth:226,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:COLORS.border},
  qrPlaceholder:{width:190,height:190,alignItems:'center',justifyContent:'center',gap:12},
  placeholderText:{fontSize:11,lineHeight:16,textAlign:'center',color:COLORS.textSecondary},
  refreshRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},
  refreshLabel:{fontSize:11,fontWeight:'700',color:COLORS.textPrimary},
  progress:{height:5,borderRadius:999,backgroundColor:COLORS.surfaceStrong,marginTop:10,overflow:'hidden'},
  progressInner:{height:'100%',borderRadius:999,backgroundColor:COLORS.primary},
  note:{marginTop:12,color:COLORS.textSecondary,fontSize:10.5,lineHeight:16,textAlign:'center'},
  retry:{alignSelf:'center',flexDirection:'row',gap:6,alignItems:'center',marginTop:10,padding:8},
  retryText:{fontWeight:'800',color:COLORS.primary,fontSize:11},
});
