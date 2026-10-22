import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { deleteAdminAttendance, updateAdminAttendanceStatus, type AdminAttendanceRecord } from '@/lib/admin';
import type { AttendanceStatus } from '@/lib/attendance';

type Props={
  visible:boolean;
  record:AdminAttendanceRecord|null;
  onClose:()=>void;
  onSaved:()=>void;
};

const STATUSES:AttendanceStatus[]=['present','late','excused'];

export default function AdminAttendanceEditModal({visible,record,onClose,onSaved}:Props){
  const[status,setStatus]=useState<AttendanceStatus>('present');
  const[saving,setSaving]=useState(false);
  const[reason,setReason]=useState('');

  useEffect(()=>{if(record){setStatus(record.status);setReason('')}},[record]);

  if(!record)return null;

  const save=async()=>{
    if(reason.trim().length<5){Alert.alert('Reason required','Enter at least 5 characters for the audit log.');return;}
    setSaving(true);
    const result=await updateAdminAttendanceStatus(record.id,status,reason);
    setSaving(false);

    if(result.error){
      Alert.alert('Could not update attendance',result.error);
      return;
    }

    onSaved();
    onClose();
  };

  const remove=()=>{
    if(reason.trim().length<5){Alert.alert('Reason required','Explain why the record should be removed.');return;}
    Alert.alert(
      'Remove attendance record?',
      'Use this only to correct an attendance record that should not exist.',
      [
        {text:'Cancel',style:'cancel'},
        {
          text:'Remove',
          style:'destructive',
          onPress:async()=>{
            setSaving(true);
            const result=await deleteAdminAttendance(record.id,reason);
            setSaving(false);

            if(result.error){
              Alert.alert('Could not remove attendance',result.error);
              return;
            }

            onSaved();
            onClose();
          },
        },
      ]
    );
  };

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}/>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.icon}><Ionicons name="create-outline" size={20} color={COLORS.primary}/></View>
          <View style={styles.headerText}><Text style={styles.title}>Correct Attendance</Text><Text style={styles.subtitle}>{record.studentName||'Student'} · {record.eventTitle}</Text></View>
          <Pressable onPress={onClose} style={styles.close}><Ionicons name="close" size={20} color={COLORS.textPrimary}/></Pressable>
        </View>

        <Text style={styles.label}>Attendance status</Text>
        <View style={styles.statusRow}>
          {STATUSES.map(value=>{
            const selected=value===status;
            return <Pressable key={value} onPress={()=>setStatus(value)} style={[styles.statusChip,selected&&styles.statusChipActive]}>
              <Text style={[styles.statusText,selected&&styles.statusTextActive]}>{value.charAt(0).toUpperCase()+value.slice(1)}</Text>
            </Pressable>;
          })}
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={17} color={COLORS.primary}/>
          <Text style={styles.noteText}>Present and Late are assigned automatically when students scan. Admin may correct the status when necessary.</Text>
        </View>

        <Text style={styles.label}>Reason (required for audit)</Text>
        <TextInput value={reason} onChangeText={setReason} multiline placeholder="Explain this attendance correction" placeholderTextColor={COLORS.textSecondary} style={styles.reasonInput}/>

        <Pressable disabled={saving} onPress={()=>void save()} style={({pressed})=>[styles.save,pressed&&styles.pressed,saving&&styles.disabled]}>
          {saving?<ActivityIndicator color="#FFFFFF"/>:<><Ionicons name="save-outline" size={18} color="#FFFFFF"/><Text style={styles.saveText}>Save Status</Text></>}
        </Pressable>

        <Pressable disabled={saving} onPress={remove} style={({pressed})=>[styles.remove,pressed&&styles.pressed,saving&&styles.disabled]}>
          <Ionicons name="trash-outline" size={17} color={COLORS.danger}/><Text style={styles.removeText}>Remove Incorrect Record</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}

const styles=StyleSheet.create({
  overlay:{flex:1,backgroundColor:COLORS.overlay,justifyContent:'center',paddingHorizontal:18},
  card:{backgroundColor:COLORS.card,borderRadius:24,padding:17},
  header:{flexDirection:'row',alignItems:'center',gap:10},
  icon:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  headerText:{flex:1},
  title:{fontSize:17,fontWeight:'800',color:COLORS.textPrimary},
  subtitle:{marginTop:2,fontSize:10.5,color:COLORS.textSecondary},
  close:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.surface},
  label:{marginTop:18,marginBottom:8,fontSize:10.5,fontWeight:'800',color:COLORS.textSecondary},
  statusRow:{flexDirection:'row',gap:7},
  statusChip:{flex:1,minHeight:40,borderRadius:12,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.surface,alignItems:'center',justifyContent:'center'},
  statusChipActive:{borderColor:'#91A7FF',backgroundColor:COLORS.primarySoft},
  statusText:{fontSize:10.5,fontWeight:'700',color:COLORS.textSecondary},
  statusTextActive:{color:COLORS.primary},
  note:{marginTop:14,backgroundColor:COLORS.primarySoft,borderRadius:14,padding:11,flexDirection:'row',gap:8},
  noteText:{flex:1,fontSize:10,lineHeight:15,color:'#617093'},
  reasonInput:{minHeight:70,padding:10,borderRadius:12,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,textAlignVertical:'top',fontSize:12,color:COLORS.textPrimary},
  save:{minHeight:49,borderRadius:15,backgroundColor:COLORS.primary,marginTop:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  saveText:{color:'#FFFFFF',fontSize:13,fontWeight:'800'},
  remove:{minHeight:44,borderRadius:14,backgroundColor:COLORS.dangerSoft,marginTop:9,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},
  removeText:{color:COLORS.danger,fontSize:11.5,fontWeight:'800'},
  pressed:{opacity:.8},
  disabled:{opacity:.5},
});
