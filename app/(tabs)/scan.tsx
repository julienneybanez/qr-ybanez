import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { registerAttendance, type RegisterResult } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';

export default function ScanScreen() {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,setScanned]=useState(false);
  const [processing,setProcessing]=useState(false);
  const [result,setResult]=useState<RegisterResult|null>(null);

  useEffect(()=>{
    if(!isFocused){
      setScanned(false);
      setProcessing(false);
      setResult(null);
    }
  },[isFocused]);

  const handleBarcodeScanned=useCallback(async({data}:{data:string})=>{
    if(scanned||processing||!isFocused)return;
    setScanned(true);
    setProcessing(true);
    setResult(null);

    try{
      const next=await registerAttendance(data,user?.id??'unknown');
      if(!isFocused)return;
      setResult(next);
    }finally{
      if(isFocused)setProcessing(false);
    }
  },[scanned,processing,isFocused,user?.id]);

  const handleScanAgain=()=>{
    setScanned(false);
    setProcessing(false);
    setResult(null);
  };

  if(!permission){
    return <View style={styles.permissionContainer}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  }

  if(!permission.granted){
    return <View style={styles.permissionContainer}>
      <View style={styles.permissionIcon}><Ionicons name="camera-outline" size={30} color={COLORS.primary}/></View>
      <Text style={styles.permissionTitle}>Camera permission needed</Text>
      <Text style={styles.permissionSubtitle}>QR Attendance needs camera access to scan event QR codes.</Text>
      <AppButton theme="primary" title="Grant Permission" icon="camera-outline" onPress={requestPermission}/>
    </View>;
  }

  return <SafeAreaView style={styles.safeArea} edges={['top']}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Scan QR Code</Text>
    </View>

    <View style={styles.cameraSection}>
      {isFocused?<CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={scanned?undefined:handleBarcodeScanned}/>:null}
      <View style={styles.frame}>
        <View style={[styles.corner,styles.topLeft]}/><View style={[styles.corner,styles.topRight]}/><View style={[styles.corner,styles.bottomLeft]}/><View style={[styles.corner,styles.bottomRight]}/>
        {!scanned?<View style={styles.scanLine}/>:null}
      </View>
      <View style={styles.cameraHint}><Ionicons name="scan-outline" size={20} color="#fff"/><Text style={styles.cameraHintText}>Align the event QR within the frame</Text></View>
    </View>

    <View style={styles.resultCard}>
      {processing?
        <><ActivityIndicator size="small" color={COLORS.primary}/><Text style={styles.resultTitle}>Verifying attendance...</Text></>:
        scanned&&result?
          result.success?<SuccessResult result={result} onScanAgain={handleScanAgain}/>:<ErrorResult result={result} onScanAgain={handleScanAgain}/>:
          <><View style={styles.resultIcon}><Ionicons name="qr-code-outline" size={22} color={COLORS.primary}/></View><Text style={styles.resultTitle}>Ready to scan</Text><Text style={styles.resultMessage}>Hold your phone steady and keep the QR code inside the guide.</Text></>}
    </View>
  </SafeAreaView>;
}

function SuccessResult({result,onScanAgain}:{result:RegisterResult;onScanAgain:()=>void}){
  const status=result.attendanceStatus??'present';
  const late=status==='late';
  const color=late?COLORS.warning:COLORS.success;
  const background=late?COLORS.warningSoft:COLORS.successSoft;
  const recordedAt=result.recordedAt?new Date(result.recordedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'Just now';

  return <>
    <View style={[styles.resultIcon,{backgroundColor:background}]}><Ionicons name={late?'time-outline':'checkmark-outline'} size={23} color={color}/></View>
    <Text style={styles.resultTitle}>Attendance Recorded</Text>
    <Text style={styles.eventTitle}>{result.eventTitle||'School Event'}</Text>
    {result.eventCode?<Text style={styles.eventCode}>{result.eventCode}</Text>:null}

    <View style={styles.confirmationBox}>
      <Detail label="Status" value={late?'Late':'Present'} valueColor={color}/>
      <View style={styles.divider}/>
      <Detail label="Recorded at" value={recordedAt}/>
      {result.studentNumber?<><View style={styles.divider}/><Detail label="Student ID" value={result.studentNumber}/></>:null}
    </View>

    <Text style={styles.resultMessage}>
      {late
        ? 'This scan was after the event\'s '+(result.lateAfterMinutes??15)+'-minute late threshold.'
        : 'Your attendance was recorded within the event\'s allowed on-time window.'}
    </Text>
    <AppButton theme="primary" title="Scan Another" icon="refresh-outline" onPress={onScanAgain}/>
  </>;
}

function ErrorResult({result,onScanAgain}:{result:RegisterResult;onScanAgain:()=>void}){
  return <>
    <View style={[styles.resultIcon,styles.resultIconError]}><Ionicons name="alert-outline" size={23} color={COLORS.danger}/></View>
    <Text style={styles.resultTitle}>Unable to record</Text>
    {result.eventTitle?<Text style={styles.eventTitle}>{result.eventTitle}</Text>:null}
    <Text style={styles.resultMessage}>{result.message}</Text>
    <AppButton theme="primary" title="Scan Another" icon="refresh-outline" onPress={onScanAgain}/>
  </>;
}

function Detail({label,value,valueColor}:{label:string;value:string;valueColor?:string}){
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={[styles.detailValue,valueColor?{color:valueColor}:null]}>{value}</Text></View>;
}

const C=34,W=4;
const styles=StyleSheet.create({
  safeArea:{flex:1,backgroundColor:COLORS.navy},
  header:{backgroundColor:COLORS.navy,paddingHorizontal:20,paddingTop:14,paddingBottom:16},
  headerTitle:{color:'#fff',fontSize:21,fontWeight:'800',letterSpacing:-.35},
  cameraSection:{flex:1,minHeight:350,backgroundColor:'#101726',position:'relative',alignItems:'center',justifyContent:'center'},
  frame:{width:230,height:230,position:'relative'},
  corner:{position:'absolute',width:C,height:C,borderColor:'#fff'},
  topLeft:{top:0,left:0,borderTopWidth:W,borderLeftWidth:W,borderTopLeftRadius:13},
  topRight:{top:0,right:0,borderTopWidth:W,borderRightWidth:W,borderTopRightRadius:13},
  bottomLeft:{bottom:0,left:0,borderBottomWidth:W,borderLeftWidth:W,borderBottomLeftRadius:13},
  bottomRight:{bottom:0,right:0,borderBottomWidth:W,borderRightWidth:W,borderBottomRightRadius:13},
  scanLine:{position:'absolute',left:14,right:14,top:'50%',height:3,borderRadius:2,backgroundColor:'#5F82FF',shadowColor:'#5F82FF',shadowOpacity:.9,shadowRadius:9,elevation:7},
  cameraHint:{position:'absolute',left:22,right:22,bottom:18,backgroundColor:'rgba(9,14,31,.7)',borderRadius:16,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  cameraHintText:{color:'#fff',fontSize:12,fontWeight:'600'},
  resultCard:{backgroundColor:COLORS.card,paddingHorizontal:20,paddingTop:16,paddingBottom:90,alignItems:'center'},
  resultIcon:{width:46,height:46,borderRadius:15,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:8},
  resultIconError:{backgroundColor:COLORS.dangerSoft},
  resultTitle:{fontSize:16,fontWeight:'800',color:COLORS.textPrimary,textAlign:'center',marginTop:4},
  eventTitle:{fontSize:13,fontWeight:'800',color:COLORS.textPrimary,textAlign:'center',marginTop:6},
  eventCode:{fontSize:10,fontWeight:'700',color:COLORS.primary,marginTop:2},
  resultMessage:{fontSize:11,lineHeight:17,color:COLORS.textSecondary,textAlign:'center',marginTop:8,marginBottom:12},
  confirmationBox:{width:'100%',marginTop:11,backgroundColor:COLORS.surface,borderRadius:15,paddingHorizontal:12},
  detailRow:{minHeight:38,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  detailLabel:{fontSize:10,color:COLORS.textSecondary},
  detailValue:{fontSize:11,fontWeight:'800',color:COLORS.textPrimary},
  divider:{height:1,backgroundColor:COLORS.border},
  permissionContainer:{flex:1,backgroundColor:COLORS.background,justifyContent:'center',alignItems:'center',paddingHorizontal:28},
  permissionIcon:{width:64,height:64,borderRadius:20,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:18},
  permissionTitle:{fontSize:20,fontWeight:'800',color:COLORS.textPrimary,marginBottom:8,textAlign:'center'},
  permissionSubtitle:{fontSize:14,lineHeight:20,color:COLORS.textSecondary,textAlign:'center',marginBottom:20},
});
