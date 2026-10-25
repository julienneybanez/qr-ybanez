import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { STAMP_THEMES } from '@/constants/stampThemes';
import type { PassportStamp } from '@/lib/passport';

type Props = {
  stamp: PassportStamp;
  onPress?: () => void;
  compact?: boolean;
};

function OrnamentalLines({ ink, accent }: { ink: string; accent: string }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 160 170" preserveAspectRatio="none">
      <Rect x="9" y="9" width="142" height="152" rx="2" fill="none" stroke={ink} strokeOpacity=".38" strokeWidth="1"/>
      <Rect x="14" y="14" width="132" height="142" rx="1" fill="none" stroke={accent} strokeOpacity=".6" strokeWidth="1"/>
      <Line x1="27" y1="25" x2="57" y2="25" stroke={ink} strokeOpacity=".5"/>
      <Line x1="103" y1="25" x2="133" y2="25" stroke={ink} strokeOpacity=".5"/>
      <Path d="M 24 35 Q 80 18 136 35 M 24 138 Q 80 154 136 138" fill="none" stroke={accent} strokeOpacity=".65"/>
      <Circle cx="22" cy="22" r="3" fill={accent} />
      <Circle cx="138" cy="22" r="3" fill={accent} />
      <Circle cx="22" cy="148" r="3" fill={accent} />
      <Circle cx="138" cy="148" r="3" fill={accent} />
    </Svg>
  );
}

export default function StampCard({ stamp, onPress, compact = false }: Props) {
  const theme = STAMP_THEMES[stamp.theme];
  const earned = Boolean(stamp.earnedAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={stamp.title + (earned ? ', collected' : ', locked')}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.outer, pressed && styles.pressed]}
    >
      <View style={[styles.paper, { backgroundColor: earned ? theme.background : '#EFF1F5' }, compact && styles.paperCompact]}>
        <View style={[styles.perforation, { borderColor: earned ? theme.ink : '#ABB3C4' }]}>
          {earned ? <OrnamentalLines ink={theme.ink} accent={theme.accent}/> : null}
          <Text numberOfLines={1} style={[styles.edition, { color: earned ? theme.dark : '#8D97AA' }]}>
            {earned ? theme.caption : 'NOT YET COLLECTED'}
          </Text>
          <View style={[styles.iconRing, { borderColor: earned ? theme.ink : '#B4BDCC', backgroundColor: earned ? theme.accent + '25' : '#E1E6ED' }]}>
            <Ionicons name={earned ? theme.icon : 'lock-closed-outline'} size={compact ? 29 : 35} color={earned ? theme.dark : '#8D97AA'}/>
          </View>
          <Text numberOfLines={2} style={[styles.title, { color: earned ? theme.dark : '#7E8A9C' }]}>
            {stamp.title.toUpperCase()}
          </Text>
          <Text style={[styles.year, { color: earned ? theme.ink : '#8994A6' }]}>{stamp.year}</Text>
        </View>
      </View>
      <View style={styles.under}>
        <Ionicons name={earned ? 'checkmark-circle' : 'lock-closed'} size={13} color={earned ? '#2D9778' : '#9AA5B5'}/>
        <Text style={styles.underText}>{earned ? 'Collected' : 'Locked'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, minWidth: 0 },
  pressed: { opacity: .78, transform: [{ scale: .98 }] },
  paper: { height: 180, padding: 8, borderRadius: 7, borderWidth: 1, borderColor: '#D6DCE5', shadowColor: '#162747', shadowOpacity: .08, shadowRadius: 9, elevation: 2 },
  paperCompact: { height: 164 },
  perforation: { flex: 1, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#4C6680', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 14, paddingHorizontal: 9, overflow: 'hidden' },
  edition: { fontWeight: '900', fontSize: 8, letterSpacing: 1.1, textAlign: 'center' },
  iconRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '900', fontSize: 11.5, textAlign: 'center', lineHeight: 15, minHeight: 27 },
  year: { fontWeight: '800', letterSpacing: 2, fontSize: 10 },
  under: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 7 },
  underText: { color: '#76849A', fontSize: 10, fontWeight: '700' },
});
