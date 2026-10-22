import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';

type Props = { title: string; subtitle?: string };

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.glowLarge} />
      <View style={styles.glowSmall} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  glowLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#2148CC',
    right: -95,
    bottom: -105,
  },
  glowSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3566F5',
    right: 28,
    bottom: -76,
    opacity: 0.78,
  },
  title: {
    color: COLORS.textOnPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    maxWidth: 320,
    color: '#BCC7E0',
    fontSize: 13,
    lineHeight: 19,
  },
});
