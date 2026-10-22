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
    paddingTop: 14,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  glowLarge: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#2148CC',
    right: -82,
    bottom: -92,
  },
  glowSmall: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#3566F5',
    right: 26,
    bottom: -60,
    opacity: 0.62,
  },
  title: {
    color: COLORS.textOnPrimary,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  subtitle: {
    marginTop: 4,
    maxWidth: 340,
    color: '#BCC7E0',
    fontSize: 11.5,
    lineHeight: 16,
  },
});
