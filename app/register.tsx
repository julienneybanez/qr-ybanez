import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '@/components/AppButton';
import AuthInput from '@/components/auth/AuthInput';
import RegistrationSuccessCard from '@/components/auth/RegistrationSuccessCard';
import RoleSelector, { type RegistrationRole } from '@/components/auth/RoleSelector';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [fullName,setFullName]=useState('');
  const [role,setRole]=useState<RegistrationRole>('student');
  const [studentId,setStudentId]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [success,setSuccess]=useState(false);
  const [loading,setLoading]=useState(false);

  const handleRegister = async () => {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) { setError('All fields are required.'); return; }
    if (role === 'student' && !studentId.trim()) { setError('Student ID is required for student accounts.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const { data, error: authError } = await signUp(email.trim(), password, {
        full_name: fullName.trim(), role, student_id: role === 'student' ? studentId.trim() : null,
      });
      if (authError) {
        const msg = authError.message;
        if (role === 'student' && msg.toLowerCase().includes('database error')) {
          setError('Could not create the student account. Make sure the Student ID is valid and is not already being used.');
        } else setError(msg);
      } else if (!data.session) setSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={[styles.scrollContent,{paddingTop:insets.top}]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.glowLarge}/><View style={styles.glowSmall}/>
              <View style={styles.brandRow}>
                <View style={styles.logoShell}><Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain"/></View>
                <View><Text style={styles.brandTitle}>QR Attendance</Text><Text style={styles.brandSub}>QR-Ybanez</Text></View>
              </View>
              <Text style={styles.heroTitle}>{success ? 'Almost there' : 'Create account'}</Text>
              <Text style={styles.heroSubtitle}>{success ? 'Verify your email before signing in to your new account.' : 'Set up your account to get started with QR attendance.'}</Text>
            </View>

            <View style={styles.panel}>
              {success ? <RegistrationSuccessCard email={email}/> : <>
                <Text style={styles.label}>Full name</Text>
                <AuthInput icon="person-outline" value={fullName} onChangeText={setFullName} placeholder="Enter your full name" editable={!loading}/>
                <Text style={styles.label}>I am a...</Text>
                <RoleSelector role={role} disabled={loading} onChange={setRole}/>
                {role === 'student' ? <>
                  <Text style={styles.label}>Student ID</Text>
                  <AuthInput icon="card-outline" value={studentId} onChangeText={setStudentId} placeholder="Enter your Student ID" autoCapitalize="characters" autoCorrect={false} editable={!loading}/>
                  <Text style={styles.fieldHint}>Use your actual school-issued Student ID.</Text>
                </> : null}
                <Text style={styles.label}>Email</Text>
                <AuthInput icon="mail-outline" value={email} onChangeText={setEmail} placeholder="your.email@school.edu" autoCapitalize="none" keyboardType="email-address" editable={!loading}/>
                <Text style={styles.label}>Password</Text>
                <AuthInput icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry={!showPassword} showPasswordToggle passwordVisible={showPassword} onTogglePassword={() => setShowPassword((v)=>!v)} editable={!loading}/>
                <Text style={styles.label}>Confirm password</Text>
                <AuthInput icon="shield-checkmark-outline" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter your password" secureTextEntry={!showPassword} editable={!loading}/>
                {error ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={18} color={COLORS.danger}/><Text style={styles.errorText}>{error}</Text></View> : null}
                <View style={styles.actionArea}>{loading ? <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader}/> : <AppButton theme="primary" title="Create Account" icon="person-add-outline" onPress={() => void handleRegister()}/>}</View>
                <Text style={styles.footerText}>Already have an account? <Link href="/login" style={styles.link}>Sign In</Link></Text>
              </>}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.background},keyboardView:{flex:1},scrollContent:{flexGrow:1,paddingBottom:36},
  hero:{minHeight:255,backgroundColor:COLORS.navy,paddingHorizontal:24,paddingTop:34,paddingBottom:54,overflow:'hidden'},
  glowLarge:{position:'absolute',width:230,height:230,borderRadius:115,backgroundColor:'#2148CC',right:-105,bottom:-95},
  glowSmall:{position:'absolute',width:150,height:150,borderRadius:75,backgroundColor:'#386BFF',right:40,bottom:-85,opacity:.76},
  brandRow:{flexDirection:'row',alignItems:'center',gap:12},logoShell:{width:46,height:46,borderRadius:15,backgroundColor:'rgba(255,255,255,.1)',alignItems:'center',justifyContent:'center'},logo:{width:34,height:34},brandTitle:{color:'#fff',fontSize:15,fontWeight:'800'},brandSub:{color:'#9FAACA',fontSize:11,fontWeight:'600',marginTop:2},
  heroTitle:{marginTop:26,color:'#fff',fontSize:29,fontWeight:'800',letterSpacing:-.6},heroSubtitle:{marginTop:7,maxWidth:285,color:'#C1CAE1',fontSize:13,lineHeight:19},
  panel:{marginHorizontal:16,marginTop:-30,backgroundColor:'#fff',borderRadius:26,borderWidth:1,borderColor:COLORS.border,padding:18,shadowColor:COLORS.shadow,shadowOpacity:.08,shadowRadius:22,shadowOffset:{width:0,height:10},elevation:5},
  label:{fontSize:12,fontWeight:'700',color:'#4D5873',marginBottom:7,marginTop:12},fieldHint:{marginTop:6,fontSize:10,lineHeight:15,color:COLORS.textSecondary},errorBox:{flexDirection:'row',alignItems:'center',gap:8,marginTop:14,backgroundColor:COLORS.dangerSoft,borderRadius:13,paddingHorizontal:12,paddingVertical:10},errorText:{flex:1,color:COLORS.danger,fontSize:12,lineHeight:17,fontWeight:'600'},actionArea:{marginTop:18},loader:{marginVertical:13},footerText:{fontSize:12,color:COLORS.textSecondary,textAlign:'center',marginTop:2},link:{color:COLORS.primary,fontWeight:'800'},
});
