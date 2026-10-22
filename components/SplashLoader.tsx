import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  StyleSheet,
  View,
} from 'react-native';

export default function SplashLoader() {
  const scanPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanPosition, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanPosition, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [scanPosition]);

  const translateY = scanPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [-62, 62],
  });

  return (
    <ImageBackground
      source={require('../assets/images/splash-modern.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.scannerArea}>
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [{ translateY }],
            },
          ]}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1530',
  },

  scannerArea: {
    position: 'absolute',
    top: '27%',
    left: '50%',
    width: 205,
    height: 205,
    marginLeft: -102.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  scanLine: {
    width: 172,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#16D9FF',

    shadowColor: '#16D9FF',
    shadowOpacity: 1,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 8,
  },
});