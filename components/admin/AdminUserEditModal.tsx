import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { updateAdminUserProfile, type AdminUser } from '@/lib/admin';
import type { Role } from '@/lib/profiles';

type Props={
  visible:boolean;
  user:AdminUser|null;
  currentUserId?:string|null;
  onClose:()=>void;
  onSaved:()=>void;
};

export default function AdminUserEditModal({visible,user,currentUserId,onClose,onSaved}:Props){
  const[fullName,setFullName]=useState('');
  const[role,setRole]=useState<Role>('student');
  const[studentId,setStudentId]=useState('');
  const[saving,setSaving]=useState(false);

  useEffect(()=>{
    if(!user)return;
    setFullName(user.full_name??'');
    setRole(user.role);
    setStudentId(user.student_id??'');
  },[user]);

  if(!user)return null;

  const isSelf=user.id===currentUserId;

  const save=async()=>{
    const name=fullName.trim();
    const sid=studentId.trim();

    if(!name){
      Alert.alert('Name required','Please enter the user name.');
      return;
    }

    if(role==='student'&&!sid){
      Alert.alert('Student ID required','Student accounts must have a Student ID.');
      return;
    }

    setSaving(true);
    const result=await updateAdminUserProfile(user.id,{
      fullName:name,
      role,
      studentId:role==='student'?sid:null,
    });
    setSaving(false);

    if(result.error){
      Alert.alert('Could not update user',result.error);
      return;
    }

    onSaved();
    onClose();
  };

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}/>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}><Ionicons name="person-outline" size={21} color={COLORS.primary}/></View>
          <View style={styles.headerText}><Text style={styles.title}>Edit User</Text><Text style={styles.subtitle}>{user.email}</Text></View>
          <Pressable onPress={onClose} style={styles.close}><Ionicons name="close" size={20} color={COLORS.textPrimary}/></Pressable>
        </View>

        <Text style={styles.label}>Full name</Text>
        <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Full name" placeholderTextColor={COLORS.textSecondary}/>

        <Text style={styles.label}>Role</Text>
        <View style={styles.roles}>
          {(['student','teacher','admin'] as Role[]).map(value=>{
            const selected=role===value;
            const disabled=isSelf&&value!==user.role;
            return <Pressable key={value} disabled={disabled} onPress={()=>{setRole(value);if(value!=='student')setStudentId('')}} style={[styles.roleChip,selected&&styles.roleChipActive,disabled&&styles.disabled]}>
              <Text style={[styles.roleText,selected&&styles.roleTextActive]}>{value.charAt(0).toUpperCase()+value.slice(1)}</Text>
            </Pressable>;
          })}
        </View>
        {isSelf?<Text style={styles.hint}>Your own Admin role is locked to avoid removing your access.</Text>:null}

        {role==='student'?<>
          <Text style={styles.label}>Student ID</Text>
          <TextInput value={studentId} onChangeText={setStudentId} style={styles.input} placeholder="School-issued Student ID" placeholderTextColor={COLORS.textSecondary} autoCapitalize="characters"/>
        </>:null}

        <Pressable disabled={saving} onPress={()=>void save()} style={({pressed})=>[styles.save,pressed&&styles.pressed,saving&&styles.disabled]}>
          {saving?<ActivityIndicator color="#FFFFFF"/>:<><Ionicons name="save-outline" size={18} color="#FFFFFF"/><Text style={styles.saveText}>Save Changes</Text></>}
        </Pressable>
      </View>
    </View>
  </Modal>;
}

const styles=StyleSheet.create({
  overlay:{flex:1,backgroundColor:COLORS.overlay,justifyContent:'center',paddingHorizontal:18},
  card:{backgroundColor:COLORS.card,borderRadius:24,padding:17},
  header:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:14},
  headerIcon:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  headerText:{flex:1},
  title:{fontSize:17,fontWeight:'800',color:COLORS.textPrimary},
  subtitle:{marginTop:2,fontSize:10.5,color:COLORS.textSecondary},
  close:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.surface},
  label:{fontSize:10.5,fontWeight:'800',color:COLORS.textSecondary,marginTop:10,marginBottom:6},
  input:{minHeight:46,borderRadius:14,borderWidth:1,borderColor:COLORS.border,backgroundColor:'#F8FAFD',paddingHorizontal:12,color:COLORS.textPrimary,fontSize:13},
  roles:{flexDirection:'row',gap:7},
  roleChip:{flex:1,minHeight:38,borderRadius:12,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.surface},
  roleChipActive:{backgroundColor:COLORS.primarySoft,borderColor:'#91A7FF'},
  roleText:{fontSize:10.5,fontWeight:'700',color:COLORS.textSecondary},
  roleTextActive:{color:COLORS.primary},
  hint:{marginTop:7,fontSize:9.5,lineHeight:14,color:COLORS.textSecondary},
  save:{minHeight:49,borderRadius:15,backgroundColor:COLORS.primary,marginTop:18,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  saveText:{color:'#FFFFFF',fontSize:13,fontWeight:'800'},
  pressed:{opacity:.8},
  disabled:{opacity:.5},
});
