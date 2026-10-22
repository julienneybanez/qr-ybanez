import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null); setLoading(true);
    try {
      const { error: authError } = await signIn(email.trim(), password);
      if (authError) setError(authError.message);
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.glowLarge} /><View style={styles.glowSmall} />
              <View style={styles.brandRow}>
                <View style={styles.logoShell}><Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" /></View>
                <View><Text style={styles.brandTitle}>QR Attendance</Text><Text style={styles.brandSub}>QR-Ybanez</Text></View>
              </View>
              <Text style={styles.heroTitle}>Welcome back</Text>
              <Text style={styles.heroSubtitle}>Sign in to continue to your school event attendance account.</Text>
            </View>
            <View style={styles.panel}>
              <Text style={styles.formTitle}>Sign in</Text>
              <Text style={styles.formSubtitle}>Enter your account details to continue.</Text>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputShell}>
                <View style={styles.inputIcon}><Ionicons name="mail-outline" size={18} color={COLORS.primary} /></View>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your.email@school.edu" placeholderTextColor="#98A3BB" autoCapitalize="none" keyboardType="email-address" editable={!loading} />
              </View>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputShell}>
                <View style={styles.inputIcon}><Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} /></View>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor="#98A3BB" secureTextEntry={!showPassword} editable={!loading} />
                <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} /></Pressable>
              </View>
              {error ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
              <View style={styles.actionArea}>{loading ? <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} /> : <AppButton theme="primary" title="Sign In" icon="log-in-outline" onPress={handleLogin} />}</View>
              <Text style={styles.footerText}>Don't have an account? <Link href="/register" style={styles.link}>Create Account</Link></Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.background}, keyboardView:{flex:1}, scrollContent:{flexGrow:1,paddingBottom:34},
  hero:{minHeight:270,backgroundColor:COLORS.navy,paddingHorizontal:24,paddingTop:34,paddingBottom:56,overflow:'hidden'},
  glowLarge:{position:'absolute',width:230,height:230,borderRadius:115,backgroundColor:'#2148CC',right:-105,bottom:-95},
  glowSmall:{position:'absolute',width:150,height:150,borderRadius:75,backgroundColor:'#386BFF',right:40,bottom:-85,opacity:.76},
  brandRow:{flexDirection:'row',alignItems:'center',gap:12}, logoShell:{width:46,height:46,borderRadius:15,backgroundColor:'rgba(255,255,255,.1)',alignItems:'center',justifyContent:'center'}, logo:{width:34,height:34},
  brandTitle:{color:'#fff',fontSize:15,fontWeight:'800'},brandSub:{color:'#9FAACA',fontSize:11,fontWeight:'600',marginTop:2},
  heroTitle:{marginTop:30,color:'#fff',fontSize:30,fontWeight:'800',letterSpacing:-.7},heroSubtitle:{marginTop:8,maxWidth:285,color:'#C1CAE1',fontSize:13,lineHeight:19},
  panel:{marginHorizontal:16,marginTop:-30,backgroundColor:'#fff',borderRadius:26,borderWidth:1,borderColor:COLORS.border,padding:20,shadowColor:COLORS.shadow,shadowOpacity:.08,shadowRadius:22,shadowOffset:{width:0,height:10},elevation:5},
  formTitle:{fontSize:21,fontWeight:'800',color:COLORS.textPrimary},formSubtitle:{marginTop:5,marginBottom:14,fontSize:12,color:COLORS.textSecondary},
  label:{fontSize:12,fontWeight:'700',color:'#4D5873',marginBottom:7,marginTop:12}, inputShell:{minHeight:54,backgroundColor:'#F8FAFD',borderRadius:16,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:9},inputIcon:{width:34,height:34,borderRadius:11,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},input:{flex:1,fontSize:14,color:COLORS.textPrimary,paddingVertical:12},
  errorBox:{flexDirection:'row',alignItems:'center',gap:8,marginTop:14,backgroundColor:COLORS.dangerSoft,borderRadius:13,paddingHorizontal:12,paddingVertical:10},errorText:{flex:1,color:COLORS.danger,fontSize:12,lineHeight:17,fontWeight:'600'},actionArea:{marginTop:18},loader:{marginVertical:13},footerText:{fontSize:12,color:COLORS.textSecondary,textAlign:'center',marginTop:2},link:{color:COLORS.primary,fontWeight:'800'},
});
