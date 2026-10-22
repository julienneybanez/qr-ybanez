import { useFocusEffect } from 'expo-router';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { Alert,ScrollView,StyleSheet,View } from 'react-native';
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
  return <SafeAreaView style={styles.safeArea} edges={['top']}><PageHeader title="My Profile" subtitle="Manage your account information."/><ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><ProfileHeader initials={initials} name={profile?.full_name} role={profile?.role}/><ProfileAccountCard profile={profile} fallbackEmail={user?.email} editing={editing} draftName={draftName} saving={saving} onDraftNameChange={setDraftName} onStartEditing={()=>setEditing(true)} onSaveName={()=>void handleSaveName()}/><SystemAccountId userId={user?.id}/><View style={styles.signOutSection}><AppButton variant="danger" title={signingOut?'Signing Out...':'Sign Out'} icon="log-out-outline" onPress={()=>void handleSignOut()} disabled={signingOut}/></View></ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safeArea:{flex:1,backgroundColor:COLORS.navy},container:{flex:1,backgroundColor:COLORS.background},content:{paddingHorizontal:16,paddingTop:0,paddingBottom:110},signOutSection:{marginTop:20}});
