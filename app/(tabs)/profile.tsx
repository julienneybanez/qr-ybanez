import { router, useFocusEffect } from 'expo-router';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { Alert,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '@/components/AppButton';
import PageHeader from '@/components/PageHeader';
import ProfileAccountCard from '@/components/profile/ProfileAccountCard';
import ProfileHeader from '@/components/profile/ProfileHeader';
import SystemAccountId from '@/components/profile/SystemAccountId';
import { COLORS } from '@/constants/colors';
import { signOut,useAuth } from '@/lib/auth';
import { patchCachedProfile,refreshCachedProfile,useCachedProfile } from '@/lib/profile-cache';
import { updateProfile } from '@/lib/profiles';

export default function ProfileScreen(){
  const {user}=useAuth();const {profile}=useCachedProfile(user?.id);const[draftName,setDraftName]=useState('');const[editing,setEditing]=useState(false);const[saving,setSaving]=useState(false);const[signingOut,setSigningOut]=useState(false);
  useEffect(()=>{if(!editing)setDraftName(profile?.full_name??'')},[profile?.full_name,editing]);
  useFocusEffect(useCallback(()=>{if(user)void refreshCachedProfile(user.id)},[user]));
  const initials=useMemo(()=>{const value=profile?.full_name?.trim()||profile?.email?.trim()||user?.email?.trim()||'U';return value.charAt(0).toUpperCase()},[profile,user]);
  const handleSaveName=async()=>{if(!user)return;const nextName=draftName.trim();if(!nextName){Alert.alert('Name required','Please enter your name.');return;}setSaving(true);const{error}=await updateProfile(user.id,{full_name:nextName});setSaving(false);if(error){Alert.alert('Error',error);return;}patchCachedProfile(user.id,{full_name:nextName});setEditing(false)};
  const handleSignOut=async()=>{setSigningOut(true);try{await signOut()}catch(error:any){Alert.alert('Error',error?.message||'Failed to sign out.')}finally{setSigningOut(false)}};
  return <SafeAreaView style={styles.safeArea} edges={['top']}><PageHeader title="My Profile"/><ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><ProfileHeader initials={initials} name={profile?.full_name} role={profile?.role}/><ProfileAccountCard profile={profile} fallbackEmail={user?.email} editing={editing} draftName={draftName} saving={saving} onDraftNameChange={setDraftName} onStartEditing={()=>setEditing(true)} onSaveName={()=>void handleSaveName()}/><SystemAccountId userId={user?.id}/>{profile?.role==='student'?<Pressable accessibilityRole="button" onPress={()=>router.push('/passport')} style={({pressed})=>[styles.passportButton,pressed&&{opacity:.82}]}><View style={styles.passportIcon}><Ionicons name="book-outline" size={23} color={COLORS.primary}/></View><View style={styles.passportText}><Text style={styles.passportTitle}>My Event Passport</Text><Text style={styles.passportSubtitle}>See your collected school event stamps</Text></View><Ionicons name="chevron-forward" size={19} color={COLORS.primary}/></Pressable>:null}<View style={styles.signOutSection}><AppButton variant="danger" title={signingOut?'Signing Out...':'Sign Out'} icon="log-out-outline" onPress={()=>void handleSignOut()} disabled={signingOut}/></View></ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safeArea:{flex:1,backgroundColor:COLORS.navy},container:{flex:1,backgroundColor:COLORS.background},content:{paddingHorizontal:16,paddingTop:0,paddingBottom:110},passportButton:{marginTop:16,padding:14,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:17,flexDirection:'row',alignItems:'center',gap:10},passportIcon:{width:45,height:45,borderRadius:13,backgroundColor:COLORS.primarySoft,justifyContent:'center',alignItems:'center'},passportText:{flex:1},passportTitle:{color:COLORS.textPrimary,fontWeight:'800',fontSize:13},passportSubtitle:{color:COLORS.textSecondary,fontSize:10,marginTop:4},signOutSection:{marginTop:20}});
