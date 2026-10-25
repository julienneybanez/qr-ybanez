import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STAMP_THEMES } from '@/constants/stampThemes';
import type { PassportStamp } from '@/lib/passport';

type Props = {
  stamp: PassportStamp;
  onPress?: () => void;
  compact?: boolean;
  showCaption?: boolean;
};

/**
 * Fixed vertical regions for the edition, illustration, name and year.
 * The inner decorative border follows the card's actual width instead of
 * using an independent SVG coordinate system that can overlap its content.
 */
export default function StampCard({
  stamp,
  onPress,
  compact = false,
  showCaption = true,
}: Props) {
  const theme = STAMP_THEMES[stamp.theme];
  const earned = Boolean(stamp.earnedAt);
  const ink = earned ? theme.ink : '#98A2B3';
  const darkInk = earned ? theme.dark : '#7F8A9C';
  const displayTitle = stamp.kind === 'signature'
    ? stamp.title.replace(new RegExp('\\s+' + stamp.year + '$'), '')
    : stamp.title;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={stamp.title + (earned ? ', collected' : ', locked')}
      accessibilityState={{ disabled: !onPress }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.outer, pressed && styles.pressed]}
    >
      <View style={[
        styles.paper,
        { backgroundColor: earned ? theme.background : '#F1F3F7' },
      ]}>
        <View style={[styles.perforation, { borderColor: ink }]}>
          <View style={[styles.innerFrame, { borderColor: earned ? theme.accent : '#CFD5DF' }]}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.edition, { color: darkInk }]}
            >
              {earned ? theme.caption : 'COLLECTION LOCKED'}
            </Text>

            <View style={[
              styles.iconRing,
              {
                borderColor: ink,
                backgroundColor: earned ? theme.accent + '25' : '#E4E8EE',
              },
            ]}>
              <Ionicons
                name={earned ? theme.icon : 'lock-closed-outline'}
                size={compact ? 26 : 29}
                color={darkInk}
              />
            </View>

            <View style={styles.titleArea}>
              <Text
                numberOfLines={3}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.title, { color: darkInk }]}
              >
                {displayTitle.toUpperCase()}
              </Text>
            </View>

            <Text style={[styles.year, { color: ink }]}>{stamp.year}</Text>
          </View>
        </View>
      </View>
      {showCaption ? (
        <View style={styles.under}>
          <Ionicons
            name={earned ? 'checkmark-circle' : 'lock-closed'}
            size={14}
            color={earned ? '#269570' : '#98A2B3'}
          />
          <Text style={styles.underText}>{earned ? 'Collected' : 'Locked'}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { width: '100%', minWidth: 0 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  paper: {
    width: '100%',
    height: 205,
    padding: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9DEE7',
    shadowColor: '#162747',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  perforation: {
    flex: 1,
    minWidth: 0,
    padding: 6,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerFrame: {
    width: '100%',
    height: '100%',
    minWidth: 0,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  edition: {
    width: '100%',
    fontWeight: '800',
    fontSize: 8,
    letterSpacing: 0.45,
    lineHeight: 11,
    textAlign: 'center',
    includeFontPadding: false,
  },
  iconRing: {
    width: 49,
    height: 49,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    width: '100%',
    minWidth: 0,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    width: '100%',
    fontWeight: '900',
    fontSize: 11.5,
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  year: {
    fontWeight: '800',
    letterSpacing: 1.5,
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
  },
  under: {
    minHeight: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  underText: {
    color: '#76849A',
    fontSize: 11,
    fontWeight: '700',
  },
});
