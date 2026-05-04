import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="recipes" options={{ title: 'Recipes', headerBackTitle: '' }} />
          <Stack.Screen name="recipes/[id]" options={{ title: '', headerBackTitle: '' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
