import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { getColors, lavender } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = getColors(scheme);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.canvas,
      card: colors.elevated,
      primary: scheme === 'dark' ? lavender.lav400 : lavender.lav500,
      text: colors.textPrimary,
      border: colors.line,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="analyzing" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="verdict/[barcode]" options={{ animation: 'fade_from_bottom' }} />
      </Stack>
    </ThemeProvider>
  );
}
