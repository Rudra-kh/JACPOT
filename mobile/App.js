import React, { useEffect, useState } from 'react'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as bridge from './src/services/bridge'
import { C } from './src/theme'

import PairScreen   from './src/screens/PairScreen'
import HomeScreen   from './src/screens/HomeScreen'
import CameraScreen from './src/screens/CameraScreen'
import SmsScreen    from './src/screens/SmsScreen'
import FilesScreen  from './src/screens/FilesScreen'

const Stack = createStackNavigator()
const Tab   = createBottomTabNavigator()

const NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: C.bg,
    card:        C.bg,
    text:        C.text,
    border:      'rgba(0,200,255,0.15)',
    primary:     C.cyan,
  },
}

function TabIcon({ name, focused }) {
  const icons = { Home: '⬡', Camera: '◉', SMS: '◈', Files: '▣' }
  return (
    <Text style={{
      fontSize: focused ? 17 : 14,
      color: focused ? C.cyan : C.dim,
      opacity: focused ? 1 : 0.6,
    }}>
      {icons[name] ?? '●'}
    </Text>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor:  'rgba(0,200,255,0.15)',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor:   C.cyan,
        tabBarInactiveTintColor: C.dim,
        tabBarLabelStyle: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 0.8 },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home"   component={HomeScreen} />
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="SMS"    component={SmsScreen} />
      <Tab.Screen name="Files"  component={FilesScreen} />
    </Tab.Navigator>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [startRoute, setStartRoute] = useState('Pair')

  // On launch — check if we have saved server + attempt reconnect
  useEffect(() => {
    bridge.loadSavedServer().then(saved => {
      if (saved) {
        setStartRoute('Main')
        bridge.connect(saved)
      }
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold', color: C.cyan, letterSpacing: 4 }}>
          JACPOTE
        </Text>
        <StatusBar style="light" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={NAV_THEME}>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName={startRoute}
          screenOptions={{ headerShown: false, animationEnabled: true }}
        >
          <Stack.Screen name="Pair" component={PairScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}
